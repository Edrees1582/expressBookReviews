const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

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

const bookshopURL = process.env.BOOKSHOP_URL || 'http://localhost:5000';

// Task 10: Get all books using async-await with Axios
async function getAllBooks() {
  const response = await axios.get(`${bookshopURL}/`);
  return response.data;
}

// Task 11: Get a book by ISBN using async-await with Axios
async function getBookByISBN(isbn) {
  const response = await axios.get(`${bookshopURL}/isbn/${encodeURIComponent(isbn)}`);
  return response.data;
}

module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;

// Run a task from the terminal while index.js is running
if (require.main === module) {
  const [task, value] = process.argv.slice(2);
  const tasks = {
    books: () => getAllBooks(),
    isbn: () => getBookByISBN(value),
  };

  if (!Object.prototype.hasOwnProperty.call(tasks, task) ||
      (task !== 'books' && !value)) {
    console.error('Usage: node router/general.js books | isbn "<value>"');
    process.exitCode = 1;
  } else {
    tasks[task]()
      .then((data) => console.log(JSON.stringify(data, null, 4)))
      .catch((error) => {
        console.error(JSON.stringify(error.response ? error.response.data : { message: error.message }, null, 4));
        process.exitCode = 1;
      });
  }
}
