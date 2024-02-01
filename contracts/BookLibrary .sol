// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract BookLibrary {
    error BookAlreadyBorrowed(string bookName);
    error BookNotAvailable(uint bookId);
    error BookNotBorrowed(uint bookId);
    error BookAlreadyExists(string title);

    struct Book {
        uint id;
        string title;
        uint copies;
    }

    address public owner;
    uint public nextBookId; // variable for storing the next bookId

    // mappings
    mapping(uint => Book) public bookIdToDetails; // returns the book details for a bookId
    mapping(uint => mapping(address => bool)) public bookBorrowStatus; // returns the borrowed status of a book for a user
    mapping(uint => address[]) public bookIdToBorrowers; // addresses of all the users who have borrowed a particular book
    mapping(string => bool) public bookTitleExists; // check if a book title exists
    mapping(uint => mapping(address => bool)) public hasEverBorrowed;

    // add events
    event BookAdded(uint bookId, string title, uint copies);
    event BookBorrowed(uint bookId, address borrower);
    event BookReturned(uint bookId, address borrower);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier notOwner() {
        require(msg.sender != owner, "Owner cannot perform this action");
        _;
    }

    function addBook(string memory _title, uint _copies) public onlyOwner {
        // Check if a book with this title already exists
        if (bookTitleExists[_title]) {
            revert BookAlreadyExists(_title);
        }

        // add a new book using the nextBookId as the bookId
        nextBookId++;
        bookIdToDetails[nextBookId] = Book(nextBookId, _title, _copies);

        // Update the bookTitleExists mapping
        bookTitleExists[_title] = true;

        emit BookAdded(nextBookId, _title, _copies);
    }

    function borrowBook(uint _bookId) public notOwner {
        // check if the book is available
        if (bookIdToDetails[_bookId].copies == 0) {
            revert BookNotAvailable(_bookId);
        }

        // check if the user has already borrowed the book
        if (bookBorrowStatus[_bookId][msg.sender]) {
            revert BookAlreadyBorrowed(bookIdToDetails[_bookId].title);
        }

        // update borrowed status and copies
        bookBorrowStatus[_bookId][msg.sender] = true;
        bookIdToDetails[_bookId].copies--;

        // check if the user has ever borrowed a book
        if (!hasEverBorrowed[_bookId][msg.sender]) {
            bookIdToBorrowers[_bookId].push(msg.sender);
            hasEverBorrowed[_bookId][msg.sender] = true;
        }

        emit BookBorrowed(_bookId, msg.sender);
    }

    function returnBook(uint bookId) public notOwner {
        // check if the book is borrowed by the user
        if (!bookBorrowStatus[bookId][msg.sender]) {
            revert BookNotBorrowed(bookId);
        }

        // update borrowed status and copies
        bookBorrowStatus[bookId][msg.sender] = false;
        bookIdToDetails[bookId].copies++;
        emit BookReturned(bookId, msg.sender);
    }

    function getAllUsersWhoBorrowedBook(
        uint _bookId
    ) public view returns (address[] memory) {
        return bookIdToBorrowers[_bookId];
    }

    function getUnreturnedBooksByUser(
        address _user
    ) public view returns (uint[] memory) {
        // First loop: count the number of unreturned books
        uint count = 0;
        for (uint i = 1; i <= nextBookId; i++) {
            // Start from 1, go up to and including nextBookId
            if (bookBorrowStatus[i][_user]) {
                count++;
            }
        }

        // Allocate the array with the exact size needed
        uint[] memory unreturnedBooks = new uint[](count);

        // Second loop: populate the array with the IDs of the unreturned books
        uint index = 0;
        for (uint i = 1; i <= nextBookId; i++) {
            // Start from 1, go up to and including nextBookId
            if (bookBorrowStatus[i][_user]) {
                unreturnedBooks[index] = i; // Store the actual bookId
                index++;
            }
        }

        return unreturnedBooks;
    }

}