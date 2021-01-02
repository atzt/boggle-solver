import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import workerScript from './boggle-solver';
import logo from './logo.svg';
import './App.css';
import { createWordSet, createWordTree } from './dictionary-utilities';

const BOARD_DIMENSION = 4;
const boardDimensionArray = [...Array(BOARD_DIMENSION).keys()];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
let dictionary = null;

/**
 * Generates a double array of random board values.
 */
const createRandomBoard = () => {
  let boardValues = [];
  for (let i = 0; i < BOARD_DIMENSION; i++) {
    boardValues[i] = [];
    for (let j = 0; j < BOARD_DIMENSION; j++) {
      boardValues[i][j] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
  return boardValues;
};

function App() {
  /*
   * Load the dictionary upon init of the page. This file is quite large so hopefully by the time the user has
   * finished entering all of the values into the Boggle board, we have downloaded the massive dictionary.
   * 
   * dictionary.json was modified based on words_alpha.txt found at https://github.com/dwyl/english-words
   */
  const [ dictionaryLoaded, setDictionaryLoaded ] = useState(false);
  useEffect(() => {
    import('./dictionary_en_US.json').then(data => {
      dictionary = data;
      setDictionaryLoaded(true);
    })
  }, []);

  // Retrieve form data using react-hook-form.js
  const { errors, handleSubmit, register, setValue } = useForm();
  const hasErrors = Object.keys(errors).length > 0;

  // Retrieve the words from the most recent solve
  const [ words, setWords ] = useState();

  /*
   * Event handler to begin Boggle solver. The downside of hooks is that you can have huge functions to retain
   * closure scope unless you pass in these setters as parameters. I took the former approach so bear with me.
   */
  const [ solving, setSolving ] = useState(false);
  const onSubmit = boggleBoardValues => {
    const startTime = Date.now();
    setSolving(true);

    // Reduce the words in the FULL dictionary to ones that only contain the Boggle letters
    const characters = Object.keys(boggleBoardValues).reduce((chars, key) => chars += boggleBoardValues[key], '').toLowerCase();
    const wordSet = createWordSet(dictionary, characters);
    const wordSetFinishTime = Date.now();
    console.log('Word Reduction: ' + (wordSetFinishTime - startTime) + ' ms');

    /*
     * Create Tree structure for those words. Each word will be added to the same tree structure where each
     * node in the tree represents a character in a word. If a node marks the end of a word, a flag is added
     * to that node by storing the word there (depicted below with *).
     * 
     * Utilizing this data structure will allow us to terminate the traversal of the Boggle board if we reach
     * a node that has no children.
     *
     *       G* - G - L - E*
     *      /
     * B - O
     *      \
     *       A* - R* - D*
     */
    const wordTree = createWordTree(wordSet);
    console.log('Word Tree Creation: ' + (Date.now() - wordSetFinishTime) + ' ms');

    /*
     * Hol up a minute. Before we venture into the main algorithm (found in boggle-solver.js) we are going to
     * try something wild and run the algorithm in parallel using web workers. Each worker will be given a list
     * of starting points on the Boggle board. So most of the code left in this method is just setting up which
     * starting points to give to which web workers. There will be one web worker created for every CPU the
     * machine has available.
     */
    const cpuCount = navigator.hardwareConcurrency;
    const boggleSpaces = BOARD_DIMENSION * BOARD_DIMENSION;
    const taskCount = Math.floor(boggleSpaces / cpuCount);
    const boggleBoardPoints = Object.keys(boggleBoardValues);

    // Common shutdown code that is needed upon success or error for the web workers
    let workerCount = cpuCount;
    const shutdownWorker = (worker) => {
      worker.terminate();

      const isLastWorker = --workerCount === 0;
      if (isLastWorker)  {
        setSolving(false);
        console.log('Total Time: ' + (Date.now() - startTime) + ' ms');
      }
      return isLastWorker;
    };

    // Object to store the unique words that were found
    const words = {};

    // Assign starting points to each web worker
    for (let i = 0; i < cpuCount; i++) {

      // Determine which starting points (x,y) in the boggle board a web worker will process
      const startingPoints = [];
      const startingPointCount = taskCount + (i === cpuCount - 1 ? boggleSpaces % cpuCount : 0); // The last worker just gets the remainder
      for (let j = 0; j < startingPointCount; j++) {
        startingPoints.push(boggleBoardPoints[(i * taskCount) + j]);
      }

      // Create a web worker for the set of starting points
      const worker = new Worker(workerScript);
      worker.onmessage = (e) => {

        // Add the words to our words set
        e.data.forEach(word => words[word] = true);

        // Shutdown the worker, and if it is the last worker let's update the words in state
        if (shutdownWorker(worker)) {
          setWords(Object.keys(words).sort((a,b) => a.localeCompare(b)));
        }
      };

      worker.onerror = (e) => {
        console.error('Error occurred solving Boggle board');
        shutdownWorker(worker);
      }

      // Send the task to the worker
      worker.postMessage({
        startingPoints,
        boggleBoardValues,
        wordTree
      });
    }
  };

  // Event handler for filling out the board quickly (saved dev time :) )
  const onRandom = () => {
    const values = createRandomBoard();
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        setValue(`${i},${j}`, values[i][j], { shouldValidate: true });
      }
    }
  };

  // Event handler for changing focus after entering text on the board
  const onInput = (e) => {
    const currentField = e.currentTarget;
    if (currentField.value) {
      const coordinates = currentField.name.split(',').map(c => +c);
      if (coordinates[0] === BOARD_DIMENSION - 1) {
        if (coordinates[1] === BOARD_DIMENSION - 1) {
          const runButton = document.getElementById('runButton');
          if (!runButton.disabled) {
            runButton.focus();
          }
          return;
        }
        coordinates[1] += 1;
        coordinates[0] = 0;
      } else {
        coordinates[0] += 1;
      }
      const nextField = document.querySelector('input[name="'+coordinates.join()+'"]');
      nextField.focus();
      nextField.select();
    }
  };

  return (
    <div className="app">
      <form
        className="app-content"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h1>Boggle Solver</h1>
        {
          boardDimensionArray.map((value, rowIndex) => 
            <div
              className="game-row"
              key={rowIndex}
            >
              {
                boardDimensionArray.map((value, columnIndex) =>
                  <input
                    className="game-dice"
                    key={columnIndex}
                    maxLength="1"
                    name={`${columnIndex},${rowIndex}`}
                    onInput={onInput}
                    ref={
                      register({
                        required: true,
                        pattern: /[A-Za-z]/
                      })
                    }
                    type="text"
                  />
                )
              }
            </div>
          )
        }
        <div className="button-bar">
          <div className="button-bar__button-container --right">
            <button
              className="button-bar__random-button"
              onClick={onRandom}
              type="button"
            >
              Random
            </button>
          </div>
          <div className="button-bar__button-container --left">
            <button
              className="button-bar__run-button"
              disabled={hasErrors || !dictionaryLoaded}
              id="runButton"
              title={hasErrors ? 'Please fill entire board with alphabetic values' : !dictionaryLoaded ? 'Loading dictionary' : 'Solve Boggle Board'}
              type="submit"
            >
              Run
            </button>
            <img
              alt="logo"
              className={'app-logo' + ((dictionaryLoaded && !solving) ? ' --hidden' : '')}
              src={logo}
            />
          </div>
        </div>
        {words && words.length > 0 &&
          <React.Fragment>
            <div>Word Count: {words.length}</div>
            <div className="words">
              {words.join(', ')}
            </div>
          </React.Fragment>
        }
      </form>
    </div>
  );
}

export default App;
