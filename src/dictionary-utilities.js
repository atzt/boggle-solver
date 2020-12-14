/**
 * Reduces the given dictionary by filtering on words that are at least 3 characters long and only contain the given letters
 * 
 * @param {Object} dictionary Object that contains ALL of the words in the dictionary
 * @param {String} letters String of letters found on the Boggle board
 */
export const createWordSet = (dictionary, letters) => {
  const regex = new RegExp('\\b[' + letters + ']{3,}\\b');
  return dictionary['words'].filter(word => regex.test(word.toLowerCase()));
}

/**
 * Creates a tree data structure that contains each word in the given set of words. Each node in the tree represents a letter from a word.
 * 
 * Tree structure for BOA, BOAS, BOAR, BOARD, BOARS, BOARDS, BOG, BOGGLE, BOGS
 *         S*
 *        /
 *       G* - G - L - E*
 *      /
 * B - O   S*    S*
 *      \ /    /
 *       A* - R* - D* - S*
 * 
 * @param {Array} wordSet The set of words to create the tree strucutre for
 */
export const createWordTree = (wordSet) => {
  const tree = TreeNode(); // Create a tree with an empty root node
  wordSet.forEach(word => {
    let currentNode = tree;
    for (let i = 0; i < word.length; i++) {
        const character = word[i];
        const isWord = i === word.length - 1; // The last character in the word indicates we have found a word

        const child = getChild(currentNode, character);
        if (child) {
            if (isWord) {
                child.word = word;
            }
            currentNode = child;
        } else {
            currentNode = addChild(currentNode, character, isWord ? word : undefined);
        }
    }
  });
  return tree;
};

/**
 * A datastructure to represent a node of a tree (and since navigation is essentially through a linked list approach,
 * this is all that is needed to store an entire tree). Since this is passed to a web worker I was unable to make this
 * a class nor a function, and instead created a function that returns a plain Object.
 * 
 * @param {String} value Letter at the tree node
 * @param {String} word If this tree node completes a word, then this is the word
 */
const TreeNode = (value, word) => ({
    value: value && value.toLowerCase(),
    word,
    children: []
});

/**
 * Adds a new TreeNode as a child of the given node
 * 
 * @param {Object} node Tree node to add a child to
 * @param {String} value Value of the new child tree node
 * @param {String} word If the child tree node completes a word, then this is the word
 */
const addChild = (node, value, word) => {
    const child = TreeNode(value, word);
    child.parent = node;
    node.children.push(child);
    return child;
};

/**
 * Finds a child of the given node who's value matches the given value
 * 
 * @param {Object} node Node whose children to search
 * @param {String} value Value to find child for
 */
const getChild = (node, value) =>
    node.children.find(child => child.value === value);