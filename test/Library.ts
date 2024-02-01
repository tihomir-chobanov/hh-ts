import { BookLibrary } from "../typechain-types";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("BookLibrary Contract Tests", function () {
  let bookLibrary: BookLibrary;
  let accounts: any;
  let owner: any;
  let nonOwner: any;
  let nonOwner2: any;

  // constant variables
  const Book1 = "Book1";
  const Book2 = "Book2";
  const Book3 = "Book3";
  const Book4 = "Book4";
  const Book5 = "Book5";
  const Book6 = "Book6";
  const Book7 = "Book7";
  const Book8 = "Book8";
  const Book9 = "Book9";
  const Book10 = "Book10";
  const Book11 = "Book11";
  const Book12 = "Book12";

  const copies = 3;

  before(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    nonOwner = accounts[1];
    nonOwner2 = accounts[2];

    const BookLibraryFactory = await ethers.getContractFactory("BookLibrary");
    bookLibrary = await BookLibraryFactory.deploy();
  });

  it('should successfully add a book and verify its properties', async () => {
    await bookLibrary.addBook(Book1, copies);
    const bookDetails = await bookLibrary.bookIdToDetails(1);

    expect(bookDetails.title).to.equal(Book1);
    expect(bookDetails.copies).to.equal(copies);
    expect(await bookLibrary.bookTitleExists(Book1)).to.equal(true);
  });

  it('should allow a user to borrow a book and decrease its available copies', async () => {
    await bookLibrary.addBook(Book2, copies);

    await bookLibrary.connect(nonOwner).borrowBook(2);

    const borrowedStatus = await bookLibrary.bookBorrowStatus(2, nonOwner.address);
    expect(borrowedStatus).to.equal(true);

    const copiesAfterBorrowing = await bookLibrary.bookIdToDetails(2);
    expect(copiesAfterBorrowing.copies).to.equal(copies - 1);

  });

  it('should allow a user to return a book and increase its available copies', async () => {
    await bookLibrary.connect(nonOwner).returnBook(2);

    const returnedStatus = await bookLibrary.bookBorrowStatus(2, nonOwner.address);
    expect(returnedStatus).to.equal(false);

    const copiesAfterReturning = await bookLibrary.bookIdToDetails(2);
    expect(copiesAfterReturning.copies).to.equal(copies);
  });

  it('should prevent a non-owner from adding a book', async () => {
    // this is not creating a new book, and next book id is 3
    await expect(bookLibrary.connect(nonOwner).addBook(Book3, copies))
      .to.be.revertedWith("Only owner can perform this action");

    const bookExists = await bookLibrary.bookTitleExists(Book3);
    expect(bookExists).to.equal(false);
  });


  it('should prevent a user from borrowing a book with no available copies', async () => {
    await bookLibrary.addBook(Book4, 0);
    // this is not creating a new book, and nextBookId is 3, 
    // BookDetails: [ 3n, 'Book4', 0n ]

    const borrowedStatus = await bookLibrary.bookBorrowStatus(3, nonOwner.address);
    expect(borrowedStatus).to.equal(false);

    await expect(bookLibrary.connect(nonOwner).borrowBook(3)).to.be.revertedWithCustomError(bookLibrary, "BookNotAvailable").withArgs(3);
  });

  it('should prevent a user from returning a book that was not borrowed', async () => {
    await bookLibrary.addBook(Book5, copies);
    //BookDetails: [ 4n, 'Book5', 3n ]

    await expect(bookLibrary.connect(nonOwner).returnBook(4)).to.be.revertedWithCustomError(bookLibrary, "BookNotBorrowed").withArgs(4);

    const returnedStatus = await bookLibrary.bookBorrowStatus(4, nonOwner.address);
    expect(returnedStatus).to.equal(false);
  });

  it('should maintain a list of users who have borrowed a specific book', async () => {
    await bookLibrary.addBook(Book6, copies);
    //BookDetails: [ 5n, 'Book6', 3n ]

    const bookId = 5;

    await bookLibrary.connect(nonOwner).borrowBook(bookId);
    await bookLibrary.connect(nonOwner2).borrowBook(bookId);

    const borrowers = await bookLibrary.getAllUsersWhoBorrowedBook(bookId);

    expect(borrowers).to.include(nonOwner.address);
    expect(borrowers).to.include(nonOwner2.address);
  });

  it('should prevent a user from borrowing a book that they have already borrowed', async () => {
    await bookLibrary.addBook(Book7, copies);
    await bookLibrary.connect(nonOwner).borrowBook(6);

    await expect(bookLibrary.connect(nonOwner).borrowBook(6)).to.be.revertedWithCustomError(bookLibrary, "BookAlreadyBorrowed").withArgs(Book7);
  }
  );

  it('should provide a list of borrowed books for a specific user', async () => {
    await bookLibrary.addBook(Book8, copies);
    await bookLibrary.addBook(Book9, copies);
    await bookLibrary.connect(nonOwner).borrowBook(7);
    await bookLibrary.connect(nonOwner).borrowBook(8);

    const booksBorrowedByUser = await bookLibrary.getUnreturnedBooksByUser(nonOwner.address);
    expect(booksBorrowedByUser).to.include(7n);
    expect(booksBorrowedByUser).to.include(8n);

  });

  it('should prevent the owner from borrowing a book', async () => {
    await bookLibrary.addBook(Book10, copies);
    await expect(bookLibrary.connect(owner).borrowBook(9))
      .to.be.revertedWith("Owner cannot perform this action");

    const borrowedStatus = await bookLibrary.bookBorrowStatus(9, owner.address);
    expect(borrowedStatus).to.equal(false);
  });

  it('should prevent adding a duplicate book title by reverting with the correct error', async () => {
    await bookLibrary.addBook(Book11, copies);
    await expect(bookLibrary.connect(owner).addBook(Book11, copies))
      .to.be.revertedWithCustomError(bookLibrary, "BookAlreadyExists")
      .withArgs(Book11);
  });

  it("should record a user's borrowing of a book", async () => {
    await bookLibrary.addBook(Book12, copies);
    await bookLibrary.connect(nonOwner).borrowBook(11);

    const hasBorrowed = await bookLibrary.hasEverBorrowed(11, nonOwner.address);
    expect(hasBorrowed).to.be.true;

    const borrowers = await bookLibrary.getAllUsersWhoBorrowedBook(11);
    expect(borrowers).to.include(nonOwner.address);
  });
}
);