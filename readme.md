# CINEBOOK – Online Movie Ticket Reservation and Management System

CineBook is a Java-based online movie ticket reservation and management system developed as an academic project for the Software Development Fundamentals (SDF) course.

The application allows users to register, log in, browse movies, select seats, book tickets, view their bookings, cancel reservations, and verify digital tickets.

## Features

- **User Registration:** New users can create an account.
- **User Login:** Registered users can securely log in to the application.
- **Movie Browsing:** View the available movies.
- **Seat Selection:** Select seats through an interactive seat-selection interface.
- **Ticket Booking:** Book movie tickets through the application.
- **Simulated Payment:** Complete the booking through a simulated payment process.
- **Digital Ticket:** Generate a booking confirmation with a QR code.
- **My Bookings:** View existing reservations.
- **Booking Cancellation:** Cancel eligible bookings with a simulated refund calculation.
- **Ticket Verification:** Verify tickets using a unique Booking ID.

## Technologies Used

- **Java** – Backend development and application logic.
- **HTML** – Frontend structure.
- **CSS** – Styling and user interface design.
- **JavaScript** – Frontend interactivity and API communication.
- **Java HttpServer** – Built-in Java HTTP server.
- **File Handling** – Local data storage.
- **QRCode.js** – QR code generation.

## Project Structure

```text
MovieTicketBookingSystem/
│
├── src/
│   └── Main.java
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── data/       (Local application data; not included)
└── out/        (Compiled class files; not included)
```

## How to Run the Project

### Prerequisites
- Java Development Kit (JDK) installed.
- A web browser.
- Internet connection for loading the QRCode.js library from its CDN.

### Steps

1. Clone or download this repository.
2. Open the project folder in Command Prompt or a terminal.
3. Compile the Java source code:

```bash
javac -d out src/Main.java
```

4. Start the application:

```bash
java -cp out Main
```

5. Open the following URL in your web browser:

```text
http://localhost:8080
```

## Ticket Verification

CineBook provides a ticket verification feature that checks a booking using its unique Booking ID and displays its validity and booking status.

## Important Notes

- The payment and refund processes are simulated for academic demonstration.
- Application data is stored locally.
- The project is intended for educational purposes and is not a production-ready ticketing platform.

## Academic Project

**Project Title:** CINEBOOK – Online Movie Ticket Reservation and Management System  
**Course:** Software Development Fundamentals (CSC203B)  
**Student:** Aakansh Dubey  
**Registration Number:** 25ETCS002005  
**Programme:** B.Tech – Computer Science and Engineering  
**Academic Year:** 2026–2027
