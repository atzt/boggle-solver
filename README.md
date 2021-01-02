# Boggle Solver

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

This is a React application providing users a UI to enter whatever alphabetic characters they would like into a Boggle game board and displaying ALL of the words that can be created from that game board. It only supports an English US dictionary. The application can be accessed via my [GitHub Pages app](https://atzt.github.io/boggle-solver/). Feel free to play around with it.

Files of interest for review would be:
- App.css - App specific CSS file
- App.js - UI code
- boggle-solver.js - Web worker that runs the boggle algorithm
- dictionary_en_US.json - JSON file with English dictionary. See resources below for where file was originally found.
- dictionary-test.json - Test file of only two "words" used for testing.
- dictionary-utilities.js - Utility functions reading dictionary and creating data structures from it
- index.css - Element CSS
- node.js.yml -  CI/CD pipeline configuration

A majority of the remaining files were generated via `create-react-app`.

## The Main Algorithm:
Approach: An exhaustive game board traversal where each starting point on the game board can be extracted as its own problem and run in isolation as a concurrent task.

- Step 1 - Reduce a FULL English dictionary to just the words that contain only the letters found on the game board.
- Step 2 - Create a tree data structure of the selected words used during game board traversal. This will allow the algorithm to prematurely stop traversing paths within the game board if we find that there exist no more words along a specific path. Then we won't need to check all 12 million paths.
- Step 3 - Group the starting points on the game board (coordinates (0,0) - (3,3)) to be given to a list of web workers (one for each CPU) so that we can run this algorithm in parallel.

## Time Limit Reached
I spent an exorbitant amount of time debating how to present this project (React web app vs. Java CLI program). Sprint Retro: Should have done the CLI. :) I wouldn't have spent so much time looking into choices for hosting my web app and building a CI/CD pipeline. Seeing as Java is not used in house at RStudio I chose the flashier approach. At the 4 hour mark I had CI/CD pipeline created, UI completed, and part way through the algorithm. Getting the web workers to play nicely with React and ES6 ended up being a large time suck.

## Future 
Due to reaching the time constraints the following features were intentionally left out:
- Unit Testing (And yet I spent all that time creating a CD pipeline with automatic testing)
- UI Updates
    - Add better validation to prevent bad input
    - Validation is a little touchy when entering in non-alphabetic keys (submit button is not disabled and title is not properly set)

## Takeaways
This was the first time I have used web workers. I have had plenty of experience working with concurrency APIs in Java so this was a fun experiment. That being said there is an interesting behavior of web workers. When providing any data to a web worker, the data is cloned over. I believe this behavior in combination with passing in a large set of words may have caused a negative performance impact. Based on my tests running with a single CPU ran in about 70 ms while running with 4 CPUs took ~130ms. It almost doubled the time.

## Resources
- [Create React App](https://github.com/facebook/create-react-app)
- [English Dictionary](https://github.com/dwyl/english-words)
- [React Hook Form](https://react-hook-form.com/)
- [Web Worker Hack](https://github.com/facebook/create-react-app/issues/1277) mentioned in boggle-solver.js
