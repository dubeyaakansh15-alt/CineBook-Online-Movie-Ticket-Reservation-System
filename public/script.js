
/* =====================================================
   CINEBOOK - ONLINE MOVIE TICKET BOOKING SYSTEM
   Registration | Login | Booking | QR Tickets
   My Bookings | Cancellation | Refund | Verification
===================================================== */


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let movies = [];
let selectedMovie = null;
let selectedSeats = [];
let bookedSeats = [];
let currentBooking = null;

const moviePosters = {
    "M001": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    "M002": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "M003": "https://image.tmdb.org/t/p/w500/66A9MqXOyVFCssoloscw79z8Tew.jpg",
    "M004": "https://cf-img-a-in.tosshub.com/sites/visualstory/wp/2025/10/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI_V1_ITG-1761637983234.jpg?size=%2A%3A900",
    "M005": "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"
};

const homeSection = document.getElementById("homeSection");
const loginSection = document.getElementById("loginSection");
const registrationSection = document.getElementById("registrationSection");
const dashboardSection = document.getElementById("dashboardSection");


// =====================================================
// COMMON HELPERS
// =====================================================

function scrollTop() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return replacements[character];
    });
}

function getPaymentLabel(method) {
    const labels = {
        "UPI": "UPI Payment (Simulated)",
        "CARD": "Debit / Credit Card (Simulated)",
        "NETBANKING": "Net Banking (Simulated)"
    };

    return labels[method] || method || "Not available";
}

async function readServerError(response) {
    try {
        const result = await response.json();
        return result.error || result.message || "Something went wrong.";
    } catch (error) {
        return await response.text();
    }
}


// =====================================================
// REGISTRATION
// =====================================================

const registrationForm = document.getElementById("registrationForm");
const registrationMessage = document.getElementById("registrationMessage");

registrationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const customerData = new URLSearchParams();

    customerData.append(
        "name",
        document.getElementById("customerName").value.trim()
    );

    customerData.append(
        "email",
        document.getElementById("customerEmail").value.trim()
    );

    customerData.append(
        "phone",
        document.getElementById("customerPhone").value.trim()
    );

    customerData.append(
        "password",
        document.getElementById("customerPassword").value
    );

    registrationMessage.textContent = "Creating account...";
    registrationMessage.style.color = "#ffcc00";

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: customerData.toString()
        });

        const message = await response.text();

        registrationMessage.textContent = message;
        registrationMessage.style.color =
            response.ok ? "#4caf50" : "#ff4444";

        if (response.ok) {
            registrationForm.reset();
        }

    } catch (error) {
        registrationMessage.textContent =
            "Unable to connect to the server.";

        registrationMessage.style.color = "#ff4444";
        console.error(error);
    }
});


// =====================================================
// LOGIN
// =====================================================

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const loginData = new URLSearchParams();

    loginData.append(
        "email",
        document.getElementById("loginEmail").value.trim()
    );

    loginData.append(
        "password",
        document.getElementById("loginPassword").value
    );

    loginMessage.textContent = "Verifying login...";
    loginMessage.style.color = "#ffcc00";

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: loginData.toString()
        });

        const message = await response.text();

        if (response.ok && message.startsWith("LOGIN_SUCCESS|")) {

            const encodedName = message.split("|")[1];

            const customerName = decodeURIComponent(
                encodedName.replace(/\+/g, " ")
            );

            homeSection.hidden = true;
            loginSection.hidden = true;
            registrationSection.hidden = true;
            dashboardSection.hidden = false;

            document.getElementById("dashboardWelcome").textContent =
                "Welcome, " + customerName + "!";

            loginForm.reset();

            createDashboardFeatures();
            scrollTop();

        } else {
            loginMessage.textContent = message;
            loginMessage.style.color = "#ff4444";
        }

    } catch (error) {
        loginMessage.textContent =
            "Unable to connect to the server.";

        loginMessage.style.color = "#ff4444";
        console.error(error);
    }
});


// =====================================================
// NAVIGATION
// =====================================================

function showHome() {
    homeSection.hidden = false;
    loginSection.hidden = true;
    registrationSection.hidden = true;
    dashboardSection.hidden = true;

    document.getElementById("moviesSection").hidden = true;
    document.getElementById("bookingSection").hidden = true;

    scrollTop();
}

function showLogin() {
    homeSection.hidden = true;
    loginSection.hidden = false;
    registrationSection.hidden = true;
    dashboardSection.hidden = true;

    scrollTop();
}

function showRegistration() {
    homeSection.hidden = true;
    loginSection.hidden = true;
    registrationSection.hidden = false;
    dashboardSection.hidden = true;

    scrollTop();
}

function showDashboard() {
    homeSection.hidden = true;
    loginSection.hidden = true;
    registrationSection.hidden = true;
    dashboardSection.hidden = false;

    document.getElementById("moviesSection").hidden = true;
    document.getElementById("bookingSection").hidden = true;

    scrollTop();
}

async function logoutCustomer() {
    try {
        await fetch("/logout", {
            method: "POST"
        });
    } catch (error) {
        console.error(error);
    }

    homeSection.hidden = false;
    loginSection.hidden = true;
    registrationSection.hidden = true;
    dashboardSection.hidden = true;

    document.getElementById("moviesSection").hidden = true;
    document.getElementById("bookingSection").hidden = true;

    scrollTop();
}


// =====================================================
// DASHBOARD FEATURES
// =====================================================

function createDashboardFeatures() {

    const dashboard = document.getElementById("dashboardSection");

    if (document.getElementById("myBookingsSection")) {
        return;
    }

    const actions = document.querySelector(".dashboard-actions");

    if (actions) {
        const bookingsButton = document.createElement("button");

        bookingsButton.type = "button";
        bookingsButton.className = "secondary-btn";
        bookingsButton.textContent = "My Bookings";
        bookingsButton.onclick = openMyBookings;

        actions.insertBefore(bookingsButton, actions.lastElementChild);
    }

    const panel = document.createElement("div");

    panel.id = "myBookingsSection";
    panel.hidden = true;

    panel.innerHTML = `
        <div class="my-bookings-panel">
            <h2>My Bookings</h2>
            <p>View your tickets and manage your reservations.</p>

            <div id="myBookingsList">
                Loading your bookings...
            </div>

            <button type="button"
                    class="secondary-btn"
                    onclick="closeMyBookings()">
                Back to Dashboard
            </button>
        </div>
    `;

    dashboard.appendChild(panel);

    addTicketStyles();
}

function addTicketStyles() {

    if (document.getElementById("cinebookExtraStyles")) {
        return;
    }

    const styles = document.createElement("style");
    styles.id = "cinebookExtraStyles";

    styles.textContent = `
        #myBookingsSection {
            max-width: 1050px;
            margin: 35px auto;
            padding: 20px;
        }

        .my-bookings-panel h2 {
            color: #f5c518;
            margin-bottom: 8px;
        }

        .my-bookings-panel > p {
            color: #ccc;
            margin-bottom: 25px;
        }

        .my-booking-card {
            background: #1b1b23;
            border: 1px solid #41414b;
            border-radius: 12px;
            padding: 20px;
            margin: 18px 0;
            text-align: left;
        }

        .my-booking-card h3 {
            color: #f5c518;
            margin-bottom: 12px;
        }

        .my-booking-card p {
            color: #ddd;
            margin: 6px 0;
        }

        .booking-status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin: 8px 0;
        }

        .status-confirmed {
            background: #14532d;
            color: #86efac;
        }

        .status-cancelled {
            background: #7f1d1d;
            color: #fecaca;
        }

        .ticket-action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }

        .cancel-booking-btn {
            background: #b91c1c;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 15px;
            cursor: pointer;
        }

        .cancel-booking-btn:hover {
            background: #dc2626;
        }

        .digital-ticket {
            max-width: 750px;
            margin: 25px auto;
            background: #fff;
            color: #171717;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 12px 35px rgba(0,0,0,.35);
            text-align: left;
        }

        .ticket-header {
            background: #171717;
            color: #f5c518;
            padding: 22px;
            text-align: center;
        }

        .ticket-header h2 {
            font-size: 28px;
            margin: 0;
        }

        .ticket-header p {
            color: #ddd;
            margin-top: 5px;
        }

        .ticket-main {
            display: grid;
            grid-template-columns: 1fr 190px;
            gap: 20px;
            padding: 25px;
        }

        .ticket-main h3 {
            font-size: 25px;
            margin-bottom: 15px;
            color: #111;
        }

        .ticket-details p {
            padding: 7px 0;
            border-bottom: 1px dashed #ccc;
            color: #333;
            overflow-wrap: anywhere;
        }

        .ticket-details strong {
            color: #111;
        }

        .ticket-qr {
            text-align: center;
            align-self: center;
        }

        .ticket-qr canvas,
        .ticket-qr img {
            max-width: 160px;
            height: auto;
            margin: auto;
        }

        .ticket-qr p {
            color: #333;
            font-size: 12px;
            margin-top: 8px;
        }

        .ticket-footer {
            background: #f0f0f0;
            color: #333;
            padding: 15px 22px;
            text-align: center;
            font-size: 12px;
        }

        .ticket-actions {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            margin: 20px auto;
        }

        .ticket-message {
            text-align: center;
            color: #4ade80;
            margin: 15px;
        }

        .ticket-verification {
            margin: 20px auto;
            padding: 15px;
            max-width: 650px;
            background: #1b1b23;
            border-radius: 9px;
            color: white;
        }

        @media(max-width: 600px) {
            .ticket-main {
                grid-template-columns: 1fr;
            }

            .ticket-qr {
                order: -1;
            }
        }

        @media print {
            body * {
                visibility: hidden !important;
            }

            #printableTicket,
            #printableTicket * {
                visibility: visible !important;
            }

            #printableTicket {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                max-width: 100%;
                margin: 0;
                box-shadow: none;
            }

            .ticket-actions {
                display: none !important;
            }
        }
    `;

    document.head.appendChild(styles);
}


// =====================================================
// MY BOOKINGS
// =====================================================

async function openMyBookings() {

    createDashboardFeatures();

    document.getElementById("myBookingsSection").hidden = false;

    const list = document.getElementById("myBookingsList");

    list.innerHTML = "<p>Loading your bookings...</p>";

    try {
        const response = await fetch("/my-bookings");

        if (!response.ok) {
            throw new Error(await readServerError(response));
        }

        const bookings = await response.json();

        displayMyBookings(bookings);

    } catch (error) {
        list.innerHTML =
            `<p>${escapeHTML(error.message)}</p>`;
    }

    document.getElementById("myBookingsSection").scrollIntoView({
        behavior: "smooth"
    });
}

function closeMyBookings() {
    document.getElementById("myBookingsSection").hidden = true;
    scrollTop();
}

function displayMyBookings(bookings) {

    const list = document.getElementById("myBookingsList");

    if (!bookings.length) {
        list.innerHTML = "<p>You have no bookings yet.</p>";
        return;
    }

    list.innerHTML = "";

    bookings.slice().reverse().forEach(function (booking) {

        const card = document.createElement("div");
        card.className = "my-booking-card";

        const statusClass =
            booking.status === "CONFIRMED"
                ? "status-confirmed"
                : "status-cancelled";

        const dateParts = booking.showDate.split("-");
        const displayDate =
            dateParts.length === 3
                ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
                : booking.showDate;

        card.innerHTML = `
            <h3>${escapeHTML(booking.movie)}</h3>

            <p><strong>Booking ID:</strong>
                ${escapeHTML(booking.bookingId)}</p>

            <p><strong>Date:</strong>
                ${escapeHTML(displayDate)}</p>

            <p><strong>Time:</strong>
                ${escapeHTML(booking.showTime)}</p>

            <p><strong>Screen:</strong>
                ${escapeHTML(booking.screen)}</p>

            <p><strong>Seats:</strong>
                ${escapeHTML(booking.seats)}</p>

            <p><strong>Amount:</strong>
                ₹${Number(booking.amount)}</p>

            <p><strong>Payment:</strong>
                ${escapeHTML(getPaymentLabel(booking.paymentMethod))}</p>

            <span class="booking-status ${statusClass}">
                ${escapeHTML(booking.status)}
            </span>

            ${booking.status === "CANCELLED"
                ? `<p><strong>Simulated refund:</strong>
                    ₹${Number(booking.refundAmount || 0)}</p>`
                : ""}

            <div class="ticket-action-buttons">

                ${booking.status === "CONFIRMED"
                    ? `<button class="primary-btn"
                               onclick="viewSavedTicket('${escapeHTML(booking.bookingId)}')">
                            View Ticket
                       </button>

                       <button class="cancel-booking-btn"
                               onclick="cancelCustomerBooking('${escapeHTML(booking.bookingId)}')">
                            Cancel Booking
                       </button>`
                    : `<button class="secondary-btn"
                               onclick="viewSavedTicket('${escapeHTML(booking.bookingId)}')">
                            View Booking Details
                       </button>`}

            </div>
        `;

        list.appendChild(card);
    });
}


// =====================================================
// CANCEL BOOKING
// =====================================================

async function cancelCustomerBooking(bookingId) {

    const confirmed = confirm(
        "Are you sure you want to cancel this booking?\n\n" +
        "A simulated refund of 50% of the ticket amount will be recorded."
    );

    if (!confirmed) {
        return;
    }

    const form = new URLSearchParams();
    form.append("bookingId", bookingId);

    try {
        const response = await fetch("/cancel", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: form.toString()
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Cancellation failed.");
        }

        alert(
            "Booking cancelled successfully!\n\n" +
            "Booking ID: " + result.bookingId + "\n" +
            "Simulated refund: ₹" + result.refundAmount
        );

        await openMyBookings();

    } catch (error) {
        alert(error.message);
    }
}


// =====================================================
// LOAD QR CODE LIBRARY
// =====================================================

function loadQRCodeLibrary() {

    return new Promise(function (resolve, reject) {

        if (window.QRCode) {
            resolve();
            return;
        }

        const existing = document.getElementById("qrCodeLibrary");

        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            return;
        }

        const script = document.createElement("script");

        script.id = "qrCodeLibrary";
        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

        script.onload = resolve;

        script.onerror = function () {
            reject(new Error("Unable to load the QR code library. Check your internet connection."));
        };

        document.head.appendChild(script);
    });
}


// =====================================================
// GENERATE DIGITAL TICKET
// =====================================================

async function generateDigitalTicket(booking) {

    currentBooking = booking;

    const confirmation = document.getElementById("bookingConfirmation");

    confirmation.hidden = false;

    const dateParts = booking.showDate.split("-");
    const displayDate =
        dateParts.length === 3
            ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
            : booking.showDate;

    const ticketPayload = {
        bookingId: booking.bookingId,
        movie: booking.movie,
        date: booking.showDate,
        time: booking.showTime,
        screen: booking.screen,
        seats: booking.seats,
        amount: booking.amount,
        status: booking.status
    };

    confirmation.innerHTML = `
        <div class="confirmation-icon">✓</div>

        <h2>Booking Confirmed!</h2>

        <p>Your CineBook digital ticket is ready.</p>

        <div id="printableTicket" class="digital-ticket">

            <div class="ticket-header">
                <h2>🎬 CINEBOOK</h2>
                <p>YOUR MOVIE TICKET</p>
            </div>

            <div class="ticket-main">

                <div class="ticket-details">

                    <h3>${escapeHTML(booking.movie)}</h3>

                    <p><strong>Booking ID:</strong>
                        ${escapeHTML(booking.bookingId)}</p>

                    <p><strong>Date:</strong>
                        ${escapeHTML(displayDate)}</p>

                    <p><strong>Showtime:</strong>
                        ${escapeHTML(booking.showTime)}</p>

                    <p><strong>Screen:</strong>
                        ${escapeHTML(booking.screen)}</p>

                    <p><strong>Seats:</strong>
                        ${escapeHTML(booking.seats)}</p>

                    <p><strong>Amount:</strong>
                        ₹${Number(booking.amount)}</p>

                    <p><strong>Payment:</strong>
                        ${escapeHTML(getPaymentLabel(booking.paymentMethod))}</p>

                    <p><strong>Status:</strong>
                        ${escapeHTML(booking.status)}</p>

                </div>

                <div class="ticket-qr">

                    <div id="ticketQRCode"></div>

                    <p>Scan to read ticket details</p>

                </div>

            </div>

            <div class="ticket-footer">
                Please carry this ticket to the cinema.
                <br>
                This is an academic demonstration ticket.
            </div>

        </div>

        <p class="ticket-message">
            Thank you for choosing CineBook!
        </p>

        <div class="ticket-actions">

            <button type="button"
                    class="primary-btn"
                    onclick="printTicket()">
                Print Ticket
            </button>

            <button type="button"
                    class="secondary-btn"
                    onclick="verifyCurrentTicket()">
                Verify Ticket
            </button>

            <button type="button"
                    class="secondary-btn"
                    onclick="returnToDashboard()">
                Return to Dashboard
            </button>

        </div>

        <div id="ticketVerificationResult"
             class="ticket-verification"
             hidden>
        </div>
    `;

    try {
        await loadQRCodeLibrary();

        const qrContainer = document.getElementById("ticketQRCode");

        qrContainer.innerHTML = "";

        new QRCode(qrContainer, {
            text: JSON.stringify(ticketPayload),
            width: 160,
            height: 160,
            colorDark: "#111111",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

    } catch (error) {

        document.getElementById("ticketQRCode").innerHTML =
            `<p style="color:#b91c1c">
                QR code unavailable. Check internet connection.
            </p>`;

        console.error(error);
    }

    confirmation.scrollIntoView({
        behavior: "smooth"
    });
}


// =====================================================
// PRINT DIGITAL TICKET
// =====================================================

function printTicket() {
    window.print();
}


// =====================================================
// VIEW SAVED BOOKING TICKET
// =====================================================

async function viewSavedTicket(bookingId) {

    try {
        const response = await fetch("/my-bookings");

        if (!response.ok) {
            throw new Error(await readServerError(response));
        }

        const bookings = await response.json();

        const booking = bookings.find(function (item) {
            return item.bookingId === bookingId;
        });

        if (!booking) {
            throw new Error("Booking not found.");
        }

        document.getElementById("myBookingsSection").hidden = true;

        document.getElementById("moviesSection").hidden = true;
        document.getElementById("bookingSection").hidden = false;

        generateDigitalTicket(booking);

    } catch (error) {
        alert(error.message);
    }
}


// =====================================================
// VERIFY TICKET
// =====================================================

async function verifyCurrentTicket() {

    if (!currentBooking) {
        alert("No ticket selected.");
        return;
    }

    const resultBox =
        document.getElementById("ticketVerificationResult");

    resultBox.hidden = false;
    resultBox.textContent = "Checking ticket...";

    try {
        const params = new URLSearchParams({
            bookingId: currentBooking.bookingId
        });

        const response = await fetch(
            "/verify-ticket?" + params.toString()
        );

        const result = await response.json();

        if (!response.ok && response.status !== 404) {
            throw new Error(result.message || "Verification failed.");
        }

        resultBox.innerHTML = `
            <h3>${result.valid ? "✓ Valid Ticket" : "✗ Invalid Ticket"}</h3>

            <p><strong>Booking ID:</strong>
                ${escapeHTML(result.bookingId || currentBooking.bookingId)}</p>

            <p><strong>Movie:</strong>
                ${escapeHTML(result.movie || currentBooking.movie)}</p>

            <p><strong>Status:</strong>
                ${escapeHTML(result.status || "NOT FOUND")}</p>

            <p>${escapeHTML(result.message || "Verification completed.")}</p>
        `;

        resultBox.style.border =
            result.valid
                ? "1px solid #22c55e"
                : "1px solid #ef4444";

    } catch (error) {
        resultBox.textContent = error.message;
    }
}


// =====================================================
// LOAD MOVIES
// =====================================================

async function loadMovies() {

    try {
        const response = await fetch("/movies");

        if (!response.ok) {
            throw new Error("Unable to load movies.");
        }

        movies = await response.json();

        displayMovies();

    } catch (error) {
        console.error(error);

        document.getElementById("movieContainer").innerHTML =
            "<p>Unable to load movies. Please refresh the page.</p>";
    }
}


// =====================================================
// DISPLAY MOVIES
// =====================================================

function displayMovies() {

    const movieContainer =
        document.getElementById("movieContainer");

    movieContainer.innerHTML = "";

    movies.forEach(function (movie) {

        const card = document.createElement("div");
        card.className = "movie-card";

        const poster = moviePosters[movie.id] || "";

        card.innerHTML = `
            <img src="${poster}"
                 alt="${escapeHTML(movie.title)} poster"
                 class="movie-poster"
                 onerror="this.style.display='none'">

            <div class="movie-info">

                <h3>${escapeHTML(movie.title)}</h3>

                <p><strong>Genre:</strong>
                    ${escapeHTML(movie.genre)}</p>

                <p><strong>Language:</strong>
                    ${escapeHTML(movie.language)}</p>

                <p><strong>Duration:</strong>
                    ${escapeHTML(movie.duration)} minutes</p>

                <p><strong>Format:</strong>
                    ${escapeHTML(movie.format)}</p>

                <button class="book-movie-btn"
                        onclick="selectMovie('${escapeHTML(movie.id)}')">
                    Book Tickets
                </button>

            </div>
        `;

        movieContainer.appendChild(card);
    });
}


// =====================================================
// OPEN MOVIES
// =====================================================

function openMovies() {

    dashboardSection.hidden = true;

    document.getElementById("moviesSection").hidden = false;
    document.getElementById("bookingSection").hidden = true;

    if (document.getElementById("myBookingsSection")) {
        document.getElementById("myBookingsSection").hidden = true;
    }

    loadMovies();
    scrollTop();
}


// =====================================================
// SELECT MOVIE
// =====================================================

function selectMovie(movieId) {

    selectedMovie = movies.find(function (movie) {
        return movie.id === movieId;
    });

    if (!selectedMovie) {
        alert("Please select a valid movie.");
        return;
    }

    document.getElementById("moviesSection").hidden = true;
    document.getElementById("bookingSection").hidden = false;

    document.getElementById("selectedMovieTitle").textContent =
        selectedMovie.title;

    const today = new Date();
    const maxDate = new Date();

    maxDate.setDate(maxDate.getDate() + 7);

    document.getElementById("showDate").min = formatDate(today);
    document.getElementById("showDate").max = formatDate(maxDate);
    document.getElementById("showDate").value = formatDate(today);

    selectedSeats = [];
    bookedSeats = [];
    currentBooking = null;

    document.getElementById("seatSelectionSection").hidden = true;
    document.getElementById("paymentSection").hidden = true;
    document.getElementById("bookingConfirmation").hidden = true;

    updateBookingSummary();

    scrollTop();
}


// =====================================================
// CONTINUE TO SEAT SELECTION
// =====================================================

document.getElementById("continueToSeats").addEventListener(
    "click",
    async function () {

        const showDate = document.getElementById("showDate").value;
        const showTime = document.getElementById("showTime").value;
        const screen = document.getElementById("screen").value;

        if (!selectedMovie) {
            alert("Please select a movie first.");
            return;
        }

        if (!showDate || !showTime || !screen) {
            alert("Please select the date, showtime and screen.");
            return;
        }

        selectedSeats = [];
        bookedSeats = [];

        document.getElementById("seatSelectionSection").hidden = false;
        document.getElementById("paymentSection").hidden = true;

        renderSeats();
        updateBookingSummary();

        await loadBookedSeats();

        document.getElementById("seatSelectionSection").scrollIntoView({
            behavior: "smooth"
        });
    }
);


// =====================================================
// LOAD BOOKED SEATS
// =====================================================

async function loadBookedSeats() {

    if (!selectedMovie) {
        return;
    }

    const params = new URLSearchParams({
        movieId: selectedMovie.id,
        showDate: document.getElementById("showDate").value,
        showTime: document.getElementById("showTime").value,
        screen: document.getElementById("screen").value
    });

    try {
        const response = await fetch("/seats?" + params.toString());

        if (!response.ok) {
            throw new Error("Unable to load booked seats.");
        }

        const data = await response.json();

        bookedSeats = data.bookedSeats || [];

        renderSeats();

    } catch (error) {
        console.error(error);
        alert("Unable to check seat availability. Please try again.");
    }
}


// =====================================================
// RENDER SEATS
// =====================================================

function renderSeats() {

    const seatContainer =
        document.getElementById("seatContainer");

    seatContainer.innerHTML = "";

    const rows = ["A", "B", "C", "D", "E"];

    rows.forEach(function (row) {

        const rowElement = document.createElement("div");
        rowElement.className = "seat-row";

        const rowLabel = document.createElement("span");
        rowLabel.className = "row-label";
        rowLabel.textContent = row;

        rowElement.appendChild(rowLabel);

        for (let number = 1; number <= 6; number++) {

            const seatId = row + number;
            const seatButton = document.createElement("button");

            seatButton.type = "button";
            seatButton.textContent = number;
            seatButton.classList.add("seat");

            if (bookedSeats.includes(seatId)) {

                seatButton.classList.add("booked-seat");
                seatButton.disabled = true;
                seatButton.title = "Already booked";

            } else if (selectedSeats.includes(seatId)) {

                seatButton.classList.add("selected-seat");

            } else {

                seatButton.classList.add("available-seat");
            }

            if (!bookedSeats.includes(seatId)) {
                seatButton.addEventListener("click", function () {
                    toggleSeat(seatId);
                });
            }

            rowElement.appendChild(seatButton);
        }

        seatContainer.appendChild(rowElement);
    });
}


// =====================================================
// SELECT OR DESELECT SEAT
// =====================================================

function toggleSeat(seatId) {

    if (bookedSeats.includes(seatId)) {
        alert("This seat is already booked.");
        return;
    }

    const index = selectedSeats.indexOf(seatId);

    if (index !== -1) {
        selectedSeats.splice(index, 1);
    } else {

        if (selectedSeats.length >= 4) {
            alert("You can select a maximum of 4 seats.");
            return;
        }

        selectedSeats.push(seatId);
    }

    renderSeats();
    updateBookingSummary();
}


// =====================================================
// SEAT PRICE
// =====================================================

function getSeatPrice(seatId) {

    const row = seatId.charAt(0);

    if (row === "A" || row === "B") {
        return 150;
    }

    if (row === "C" || row === "D") {
        return 250;
    }

    return 500;
}


// =====================================================
// BOOKING SUMMARY
// =====================================================

function updateBookingSummary() {

    const selectedDisplay =
        document.getElementById("selectedSeatsDisplay");

    const totalDisplay =
        document.getElementById("totalAmount");

    if (!selectedDisplay || !totalDisplay) {
        return;
    }

    if (selectedSeats.length === 0) {
        selectedDisplay.textContent = "No seats selected";
        totalDisplay.textContent = "₹0";
        return;
    }

    selectedDisplay.textContent = selectedSeats.join(", ");

    let total = 0;

    selectedSeats.forEach(function (seat) {
        total += getSeatPrice(seat);
    });

    totalDisplay.textContent = "₹" + total;
}


// =====================================================
// CONTINUE TO PAYMENT
// =====================================================

document.getElementById("continueToPayment").addEventListener(
    "click",
    function () {

        if (selectedSeats.length === 0) {
            alert("Please select at least one seat.");
            return;
        }

        document.getElementById("seatSelectionSection").hidden = true;
        document.getElementById("paymentSection").hidden = false;

        updateBookingSummary();

        document.getElementById("paymentSection").scrollIntoView({
            behavior: "smooth"
        });
    }
);


// =====================================================
// BACK TO SEATS
// =====================================================

document.getElementById("backToSeats").addEventListener(
    "click",
    function () {

        document.getElementById("paymentSection").hidden = true;
        document.getElementById("seatSelectionSection").hidden = false;

        renderSeats();
        updateBookingSummary();

        document.getElementById("seatSelectionSection").scrollIntoView({
            behavior: "smooth"
        });
    }
);


// =====================================================
// CONFIRM BOOKING
// =====================================================

document.getElementById("confirmBooking").addEventListener(
    "click",
    async function () {

        if (!selectedSeats.length) {
            alert("Please select at least one seat.");
            return;
        }

        const paymentMethod =
            document.getElementById("paymentMethod").value;

        if (!paymentMethod) {
            alert("Please select a payment method.");
            return;
        }

        const bookingData = new URLSearchParams();

        bookingData.append("movieId", selectedMovie.id);
        bookingData.append(
            "showDate",
            document.getElementById("showDate").value
        );
        bookingData.append(
            "showTime",
            document.getElementById("showTime").value
        );
        bookingData.append(
            "screen",
            document.getElementById("screen").value
        );
        bookingData.append("seats", selectedSeats.join(","));
        bookingData.append("paymentMethod", paymentMethod);

        const button = document.getElementById("confirmBooking");

        button.disabled = true;
        button.textContent = "Processing...";

        try {
            const response = await fetch("/book", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: bookingData.toString()
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Booking failed.");
            }

            displayBookingConfirmation(result);

        } catch (error) {
            alert(error.message);
            await loadBookedSeats();

        } finally {
            button.disabled = false;
            button.textContent = "Pay Securely & Confirm Booking";
        }
    }
);


// =====================================================
// DISPLAY BOOKING CONFIRMATION AND TICKET
// =====================================================

function displayBookingConfirmation(booking) {

    selectedSeats = [];
    bookedSeats = [];

    generateDigitalTicket(booking);
}


// =====================================================
// RETURN TO DASHBOARD
// =====================================================

function returnToDashboard() {

    document.getElementById("bookingConfirmation").hidden = true;
    document.getElementById("bookingSection").hidden = true;

    dashboardSection.hidden = false;

    selectedMovie = null;
    selectedSeats = [];
    bookedSeats = [];
    currentBooking = null;

    createDashboardFeatures();

    scrollTop();
}


// =====================================================
// INITIAL PAGE SETUP
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    loadMovies();

});
