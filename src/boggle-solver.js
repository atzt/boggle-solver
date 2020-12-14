/**
 * Not your typical Web Worker code. I first attempted to place this file in the public directory but my
 * app was not finding this file. So I found a nice hack around using web workers with create-react-app.
 * 
 * https://github.com/facebook/create-react-app/issues/1277
 */
const workerCode = () => {

  onmessage = function(e) {

    const { 
      startingPoints,    // The starting points this worker is responsible for solving for
      boggleBoardValues, // All of the boggle game board letters
      wordTree           // The tree data structure of all of the possible words we could care about given the letters on the game board
    } = e.data;

    /**
     * Recursive function to find a word starting at the given point on the board
     * 
     * @param {String} point Current point on the game board
     * @param {Object} currentNode The current node in the tree
     * @param {Array} ignorePoints Points that we are not allowed to travel to next (the current path's points)
     */
    const findWords = (point, currentNode, ignorePoints = []) => {
      let words = [];

      const nextPoints = getNextPoints(point, ignorePoints);
      nextPoints.forEach(nextPoint => {

        const letter = boggleBoardValues[nextPoint];
        const nextNode = currentNode.children.find(child => child.value === letter);

        if (nextNode) {
          // If we found a word, be sure to add it!
          if (nextNode.word) {
            words.push(nextNode.word);
          }
          // If the next node has children then we should keep searching for more words down the path
          if (nextNode.children.length > 0) {
            words = words.concat(findWords(nextPoint, nextNode, ignorePoints.concat(point)));
          }
        }
      });
      return words;
    };

    const boardDimension = Math.sqrt(Object.keys(boggleBoardValues).length);

    /**
     * Retrieves all of the points that surround the given point that are NOT in ignorePoints
     * 
     * @param {String} point Point of reference to get the next points from
     * @param {Array} ignorePoints Points to ignore (the current path's points)
     */
    const getNextPoints = (point, ignorePoints) => {
      const coordinates = point.split(',').map(coordinate => +coordinate);
      const x = coordinates[0];
      const y = coordinates[1];

      const nextPoints = [];
      if (x < boardDimension - 1) {
        addNextPoint(`${x + 1},${y}`, nextPoints, ignorePoints);
        if (y > 0) {
          addNextPoint(`${x + 1},${y - 1}`, nextPoints, ignorePoints);
        }
        if (y < boardDimension - 1) {
          addNextPoint(`${x + 1},${y + 1}`, nextPoints, ignorePoints);
        }
      }
      if (y < boardDimension - 1) {
        addNextPoint(`${x},${y + 1}`, nextPoints, ignorePoints);
      }
      if (x > 0) {
        addNextPoint(`${x - 1},${y}`, nextPoints, ignorePoints);
        if (y > 0) {
          addNextPoint(`${x - 1},${y - 1}`, nextPoints, ignorePoints);
        }
        if (y < boardDimension -1) {
          addNextPoint(`${x - 1},${y + 1}`, nextPoints, ignorePoints);
        }
      }
      if (y > 0) {
        addNextPoint(`${x},${y - 1}`, nextPoints, ignorePoints);
      }
      return nextPoints;
    }

    /**
     * Helper function to add the next point to the array of next points only if it does not exist within the ignorePoints array
     * 
     * @param {String} nextPoint The next point to add
     * @param {Array} nextPoints  Array of the next points after the current point
     * @param {Array} ignorePoints Array of points to ignore
     */
    const addNextPoint = (nextPoint, nextPoints, ignorePoints) =>
      !ignorePoints.includes(nextPoint) && nextPoints.push(nextPoint);

    // Traverse Boggle board finding words starting at each starting point.
    let words = [];
    startingPoints.forEach(startingPoint => {
      
      // First see if ANY words start with the starting point's letter
      const letter = boggleBoardValues[startingPoint];
      const nextNode = wordTree.children.find(child => child.value === letter);
      if (nextNode) {
        words = words.concat(findWords(startingPoint, nextNode));
      }
    });

    // Send the words back to the main thread
    postMessage(words);
  };
}

// The following is the "hacked" code that will allow calling a web worker from within my main app. The things we do for parallelism.
let code = workerCode.toString();
code = code.substring(code.indexOf("{")+1, code.lastIndexOf("}"));

const blob = new Blob([code], { type: 'application/javascript' });
const workerScript = URL.createObjectURL(blob);

export default workerScript;
