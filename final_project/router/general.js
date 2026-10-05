const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

// Register a username and password for customer login
public_users.post("/register", (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || !username.trim() ||
      typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  if (isValid(username)) {
    return res.status(409).json({ message: "Username already exists" });
  }

  users.push({ username, password });
  return res.status(201).json({ message: "User successfully registered" });
});

// Get the book list available in the shop
public_users.get('/', function (req, res) {
  return res.status(200).type('json').send(JSON.stringify(books, null, 4));
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  if (!Object.prototype.hasOwnProperty.call(books, isbn)) {
    return res.status(404).json({ message: "Book not found" });
  }
  return res.status(200).type('json').send(JSON.stringify(books[isbn], null, 4));
});

// Get book details based on author
public_users.get('/author/:author', function (req, res) {
  const author = req.params.author;
  const matchingBooks = {};

  // Compare the URL's author with each book and preserve its ISBN in the result
  Object.keys(books).forEach((isbn) => {
    if (books[isbn].author === author) {
      matchingBooks[isbn] = books[isbn];
    }
  });

  if (Object.keys(matchingBooks).length === 0) {
    return res.status(404).json({ message: "No books found for this author" });
  }
  return res.status(200).type('json').send(JSON.stringify(matchingBooks, null, 4));
});

// Get all books based on title
public_users.get('/title/:title', function (req, res) {
  const title = req.params.title;
  const matchingBooks = {};

  // Collect all exact title matches, keyed by ISBN
  Object.keys(books).forEach((isbn) => {
    if (books[isbn].title === title) {
      matchingBooks[isbn] = books[isbn];
    }
  });

  if (Object.keys(matchingBooks).length === 0) {
    return res.status(404).json({ message: "No books found for this title" });
  }
  return res.status(200).type('json').send(JSON.stringify(matchingBooks, null, 4));
});

// Get book reviews
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  if (!Object.prototype.hasOwnProperty.call(books, isbn)) {
    return res.status(404).json({ message: "Book not found" });
  }
  return res.status(200).type('json').send(JSON.stringify(books[isbn].reviews, null, 4));
});

// Allow another API address while keeping local development simple
const bookshopURL = process.env.BOOKSHOP_URL || 'http://localhost:5000';
// Limit how long each Axios request can wait for the server
const requestOptions = { timeout: 5000 };

// All four Axios functions share this handler for HTTP, timeout, and network errors
function handleBookRequestError(error) {
  if (error.response) {
    const message = error.response.data && error.response.data.message;
    error.message = typeof message === 'string' ? message : `Book API returned HTTP ${error.response.status}`;
  } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    error.message = 'Book API request timed out after 5 seconds';
  } else if (error.request) {
    error.message = 'Unable to reach the book API. Check that the server is running';
  }
  // Rethrow the original error so callers retain its HTTP response and error code
  throw error;
}

// Reject unexpected data instead of displaying it as book details
function validateBookResponse(data, singleBook = false) {
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isBook = (book) => isObject(book) && typeof book.author === 'string' &&
    typeof book.title === 'string' && isObject(book.reviews);
  // ISBN lookup returns one book; list and search endpoints return books keyed by ISBN
  const valid = singleBook ? isBook(data) : isObject(data) && Object.values(data).every(isBook);

  if (!valid) {
    throw new Error('Book API returned an unexpected response');
  }
  return data;
}

// Task 10: Get all books using async-await with Axios
// Return the complete book catalog keyed by ISBN
async function getAllBooks() {
  const response = await axios.get(`${bookshopURL}/`, requestOptions).catch(handleBookRequestError);
  return validateBookResponse(response.data);
}

// Task 11: Get a book by ISBN using async-await with Axios
// Encode the ISBN as a URL segment and validate a single book object
async function getBookByISBN(isbn) {
  const response = await axios.get(`${bookshopURL}/isbn/${encodeURIComponent(isbn)}`, requestOptions).catch(handleBookRequestError);
  return validateBookResponse(response.data, true);
}

// Task 12: Get books by author using async-await with Axios
// Encode spaces and accents; the author route above filters the matching books
async function getBooksByAuthor(author) {
  const response = await axios.get(`${bookshopURL}/author/${encodeURIComponent(author)}`, requestOptions).catch(handleBookRequestError);
  return validateBookResponse(response.data);
}

// Task 13: Get books by title using async-await with Axios
// Send the encoded title to the title route and validate the matching books
async function getBooksByTitle(title) {
  const response = await axios.get(`${bookshopURL}/title/${encodeURIComponent(title)}`, requestOptions).catch(handleBookRequestError);
  return validateBookResponse(response.data);
}

module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;

// Run a task from the terminal while index.js is running
if (require.main === module) {
  const [task, value] = process.argv.slice(2);
  const tasks = {
    books: () => getAllBooks(),
    isbn: () => getBookByISBN(value),
    author: () => getBooksByAuthor(value),
    title: () => getBooksByTitle(value)
  };

  if (!Object.prototype.hasOwnProperty.call(tasks, task) ||
      (task !== 'books' && !value)) {
    console.error('Usage: node router/general.js books | isbn <isbn> | author "<author>" | title "<title>"');
    process.exitCode = 1;
  } else {
    tasks[task]()
      .then((data) => console.log(JSON.stringify(data, null, 4)))
      .catch((error) => {
        console.error(JSON.stringify({ message: error.message }, null, 4));
        process.exitCode = 1;
      });
  }
}
