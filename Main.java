
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Main {

    private static final int PORT = 8080;

    private static final Map<String, String> sessions =
            new ConcurrentHashMap<>();

    private static final Object bookingLock = new Object();

    private static final String[] ALLOWED_TIMES = {
        "10:00 AM", "01:00 PM", "04:00 PM",
        "07:00 PM", "10:00 PM"
    };

    private static final Path BOOKING_FILE =
            Paths.get("data/bookings.txt");

    private static final DateTimeFormatter SHOW_TIME_FORMAT =
            DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);


    // ==========================================
    // MAIN METHOD
    // ==========================================

    public static void main(String[] args) throws IOException {

        HttpServer server = HttpServer.create(
                new InetSocketAddress(PORT), 0);

        server.createContext("/register", Main::registerCustomer);
        server.createContext("/login", Main::loginCustomer);
        server.createContext("/logout", Main::logoutCustomer);

        server.createContext("/movies", Main::getMovies);
        server.createContext("/seats", Main::getBookedSeats);
        server.createContext("/book", Main::createBooking);

        server.createContext("/my-bookings", Main::getMyBookings);
        server.createContext("/cancel", Main::cancelBooking);
        server.createContext("/verify-ticket", Main::verifyTicket);

        server.createContext("/", Main::serveWebsite);

        server.setExecutor(null);
        server.start();

        System.out.println("================================");
        System.out.println("       CINEBOOK SERVER");
        System.out.println("================================");
        System.out.println("Server running at:");
        System.out.println("http://localhost:" + PORT);
    }


    // ==========================================
    // SERVE WEBSITE FILES
    // ==========================================

    private static void serveWebsite(HttpExchange exchange)
            throws IOException {

        String path = exchange.getRequestURI().getPath();

        if (path.equals("/")) {
            path = "/index.html";
        }

        Path folder = Paths.get("public")
                .toAbsolutePath().normalize();

        Path file = folder.resolve(path.substring(1)).normalize();

        if (!file.startsWith(folder) ||
                !Files.exists(file) ||
                Files.isDirectory(file)) {

            sendResponse(exchange, 404, "Page not found");
            return;
        }

        String type = "text/plain";

        if (path.endsWith(".html")) {
            type = "text/html";
        } else if (path.endsWith(".css")) {
            type = "text/css";
        } else if (path.endsWith(".js")) {
            type = "application/javascript";
        } else if (path.endsWith(".png")) {
            type = "image/png";
        } else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
            type = "image/jpeg";
        }

        byte[] content = Files.readAllBytes(file);

        exchange.getResponseHeaders().set(
                "Content-Type", type + "; charset=UTF-8");

        exchange.sendResponseHeaders(200, content.length);

        try (OutputStream out = exchange.getResponseBody()) {
            out.write(content);
        }
    }


    // ==========================================
    // CUSTOMER REGISTRATION
    // ==========================================

    private static void registerCustomer(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        try {
            Map<String, String> form = readForm(exchange);

            String name = form.getOrDefault("name", "").trim();
            String email = form.getOrDefault("email", "")
                    .trim().toLowerCase();
            String phone = form.getOrDefault("phone", "").trim();
            String password = form.getOrDefault("password", "");

            if (name.isEmpty() || email.isEmpty() ||
                    phone.isEmpty() || password.length() < 6) {

                sendResponse(exchange, 400,
                        "Please enter all details correctly.");
                return;
            }

            if (!phone.matches("[0-9]{10}") ||
                    !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {

                sendResponse(exchange, 400,
                        "Invalid email or phone number.");
                return;
            }

            Files.createDirectories(Paths.get("data"));

            Path customerFile = Paths.get("data/customers.txt");

            if (Files.exists(customerFile)) {
                for (String line : Files.readAllLines(customerFile)) {

                    String[] data = line.split("\\|", -1);

                    if (data.length >= 2 &&
                            decode(data[1]).equalsIgnoreCase(email)) {

                        sendResponse(exchange, 409,
                                "This email is already registered.");
                        return;
                    }
                }
            }

            String record =
                    encode(name) + "|" +
                    encode(email) + "|" +
                    encode(phone) + "|" +
                    hashPassword(password) +
                    System.lineSeparator();

            Files.writeString(
                    customerFile,
                    record,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND);

            sendResponse(exchange, 200,
                    "Registration successful! Welcome to CineBook.");

        } catch (Exception e) {
            logError(e);
            sendResponse(exchange, 500,
                    "Registration failed. Please try again.");
        }
    }


    // ==========================================
    // CUSTOMER LOGIN
    // ==========================================

    private static void loginCustomer(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        try {
            Map<String, String> form = readForm(exchange);

            String email = form.getOrDefault("email", "")
                    .trim().toLowerCase();

            String password = form.getOrDefault("password", "");

            Path customerFile = Paths.get("data/customers.txt");

            if (!Files.exists(customerFile)) {
                sendResponse(exchange, 401,
                        "Invalid email or password.");
                return;
            }

            String enteredHash = hashPassword(password);

            for (String line : Files.readAllLines(customerFile)) {

                String[] data = line.split("\\|", -1);

                if (data.length < 4) {
                    continue;
                }

                String savedEmail = decode(data[1]);

                if (savedEmail.equalsIgnoreCase(email) &&
                        data[3].equals(enteredHash)) {

                    String sessionId = UUID.randomUUID().toString();

                    sessions.put(sessionId, email);

                    exchange.getResponseHeaders().add(
                            "Set-Cookie",
                            "CINEBOOK_SESSION=" + sessionId +
                            "; Path=/; HttpOnly; SameSite=Lax");

                    String response = "LOGIN_SUCCESS|" +
                            URLEncoder.encode(
                                    decode(data[0]),
                                    StandardCharsets.UTF_8);

                    sendResponse(exchange, 200, response);
                    return;
                }
            }

            sendResponse(exchange, 401,
                    "Invalid email or password.");

        } catch (Exception e) {
            logError(e);
            sendResponse(exchange, 500,
                    "Unable to process login.");
        }
    }


    // ==========================================
    // CUSTOMER LOGOUT
    // ==========================================

    private static void logoutCustomer(HttpExchange exchange)
            throws IOException {

        String sessionId = getSessionId(exchange);

        if (sessionId != null) {
            sessions.remove(sessionId);
        }

        exchange.getResponseHeaders().add(
                "Set-Cookie",
                "CINEBOOK_SESSION=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");

        sendResponse(exchange, 200,
                "You have been logged out successfully.");
    }


    // ==========================================
    // GET MOVIES
    // ==========================================

    private static void getMovies(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        try {
            Path movieFile = Paths.get("data/movies.txt");

            if (!Files.exists(movieFile)) {
                sendJson(exchange, 200, "[]");
                return;
            }

            StringBuilder json = new StringBuilder("[");
            boolean first = true;

            for (String line : Files.readAllLines(movieFile)) {

                if (line.trim().isEmpty()) {
                    continue;
                }

                String[] movie = line.split("\\|", -1);

                if (movie.length != 6) {
                    continue;
                }

                if (!first) {
                    json.append(",");
                }

                json.append("{")
                    .append("\"id\":\"").append(jsonEscape(movie[0])).append("\",")
                    .append("\"title\":\"").append(jsonEscape(movie[1])).append("\",")
                    .append("\"genre\":\"").append(jsonEscape(movie[2])).append("\",")
                    .append("\"language\":\"").append(jsonEscape(movie[3])).append("\",")
                    .append("\"duration\":\"").append(jsonEscape(movie[4])).append("\",")
                    .append("\"format\":\"").append(jsonEscape(movie[5])).append("\"")
                    .append("}");

                first = false;
            }

            json.append("]");

            sendJson(exchange, 200, json.toString());

        } catch (Exception e) {
            logError(e);
            sendJson(exchange, 500,
                    "{\"error\":\"Unable to load movies.\"}");
        }
    }


    // ==========================================
    // GET BOOKED SEATS
    // ==========================================

    private static void getBookedSeats(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            sendJson(exchange, 405,
                    "{\"error\":\"Method not allowed.\"}");
            return;
        }

        try {
            Map<String, String> params =
                    getQueryParameters(exchange);

            String movieId = params.getOrDefault("movieId", "").trim();
            String showDate = params.getOrDefault("showDate", "").trim();
            String showTime = params.getOrDefault("showTime", "").trim();
            String screen = params.getOrDefault("screen", "").trim();

            if (movieId.isEmpty() || showDate.isEmpty() ||
                    showTime.isEmpty() || screen.isEmpty()) {

                sendJson(exchange, 400,
                        "{\"error\":\"Missing show details.\"}");
                return;
            }

            Set<String> bookedSeats = new TreeSet<>();

            synchronized (bookingLock) {

                if (Files.exists(BOOKING_FILE)) {

                    for (String line : Files.readAllLines(BOOKING_FILE)) {

                        String[] saved = line.split("\\|", -1);

                        if (saved.length < 11) {
                            continue;
                        }

                        boolean sameShow =
                                saved[2].equals(movieId) &&
                                saved[3].equals(showDate) &&
                                decode(saved[4]).equals(showTime) &&
                                decode(saved[5]).equals(screen) &&
                                saved[9].equals("CONFIRMED");

                        if (sameShow) {
                            for (String seat : saved[6].split(",")) {
                                if (!seat.isBlank()) {
                                    bookedSeats.add(
                                            seat.trim().toUpperCase());
                                }
                            }
                        }
                    }
                }
            }

            StringBuilder json =
                    new StringBuilder("{\"bookedSeats\":[");

            boolean first = true;

            for (String seat : bookedSeats) {

                if (!first) {
                    json.append(",");
                }

                json.append("\"")
                    .append(jsonEscape(seat))
                    .append("\"");

                first = false;
            }

            json.append("]}");

            sendJson(exchange, 200, json.toString());

        } catch (Exception e) {
            logError(e);
            sendJson(exchange, 500,
                    "{\"error\":\"Unable to check seat availability.\"}");
        }
    }


    // ==========================================
    // CREATE MOVIE BOOKING
    // ==========================================

    private static void createBooking(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
            sendJson(exchange, 405,
                    "{\"error\":\"Method not allowed.\"}");
            return;
        }

        try {

            String customerEmail = getLoggedInEmail(exchange);

            if (customerEmail == null) {
                sendJson(exchange, 401,
                        "{\"error\":\"Please login before booking.\"}");
                return;
            }

            Map<String, String> form = readForm(exchange);

            String movieId = form.getOrDefault("movieId", "").trim();
            String showDate = form.getOrDefault("showDate", "").trim();
            String showTime = form.getOrDefault("showTime", "").trim();
            String screen = form.getOrDefault("screen", "").trim();
            String seatsText = form.getOrDefault("seats", "").trim();

            String paymentMethod = form.getOrDefault(
                    "paymentMethod", "").trim().toUpperCase();

            String movieTitle = getMovieTitle(movieId);

            if (movieTitle == null) {
                sendJson(exchange, 400,
                        "{\"error\":\"Invalid movie selected.\"}");
                return;
            }

            LocalDate bookingDate;

            try {
                bookingDate = LocalDate.parse(showDate);
            } catch (Exception e) {
                sendJson(exchange, 400,
                        "{\"error\":\"Please select a valid date.\"}");
                return;
            }

            LocalDate today = LocalDate.now();

            if (bookingDate.isBefore(today) ||
                    bookingDate.isAfter(today.plusDays(7))) {

                sendJson(exchange, 400,
                        "{\"error\":\"Bookings are available only for the next 7 days.\"}");
                return;
            }

            if (!Arrays.asList(ALLOWED_TIMES).contains(showTime)) {
                sendJson(exchange, 400,
                        "{\"error\":\"Invalid showtime selected.\"}");
                return;
            }

            if (!Arrays.asList(
                    "Screen 1", "Screen 2", "Screen 3"
            ).contains(screen)) {

                sendJson(exchange, 400,
                        "{\"error\":\"Invalid screen selected.\"}");
                return;
            }

            if (!Arrays.asList(
                    "UPI", "CARD", "NETBANKING"
            ).contains(paymentMethod)) {

                sendJson(exchange, 400,
                        "{\"error\":\"Invalid payment method.\"}");
                return;
            }

            String[] seats = seatsText.split(",");

            if (seats.length < 1 || seats.length > 4) {
                sendJson(exchange, 400,
                        "{\"error\":\"Select between 1 and 4 seats.\"}");
                return;
            }

            Set<String> uniqueSeats = new LinkedHashSet<>();
            int totalAmount = 0;

            for (String seat : seats) {

                seat = seat.trim().toUpperCase();

                if (!seat.matches("[A-E][1-6]") ||
                        !uniqueSeats.add(seat)) {

                    sendJson(exchange, 400,
                            "{\"error\":\"Invalid or duplicate seat selected.\"}");
                    return;
                }

                char row = seat.charAt(0);

                if (row == 'A' || row == 'B') {
                    totalAmount += 150;
                } else if (row == 'C' || row == 'D') {
                    totalAmount += 250;
                } else {
                    totalAmount += 500;
                }
            }

            synchronized (bookingLock) {

                Files.createDirectories(Paths.get("data"));

                if (Files.exists(BOOKING_FILE)) {

                    for (String line : Files.readAllLines(BOOKING_FILE)) {

                        String[] saved = line.split("\\|", -1);

                        if (saved.length < 11) {
                            continue;
                        }

                        boolean sameShow =
                                saved[2].equals(movieId) &&
                                saved[3].equals(showDate) &&
                                decode(saved[4]).equals(showTime) &&
                                decode(saved[5]).equals(screen) &&
                                saved[9].equals("CONFIRMED");

                        if (sameShow) {

                            Set<String> alreadyBooked =
                                    new HashSet<>(
                                            Arrays.asList(saved[6].split(","))
                                    );

                            for (String seat : uniqueSeats) {

                                if (alreadyBooked.contains(seat)) {

                                    sendJson(exchange, 409,
                                            "{\"error\":\"Seat " +
                                            jsonEscape(seat) +
                                            " is already booked. Please choose another seat.\"}");
                                    return;
                                }
                            }
                        }
                    }
                }

                String bookingId = "CB" +
                        UUID.randomUUID()
                        .toString()
                        .substring(0, 8)
                        .toUpperCase();

                String seatList = String.join(",", uniqueSeats);

                String record =
                        bookingId + "|" +
                        encode(customerEmail) + "|" +
                        movieId + "|" +
                        showDate + "|" +
                        encode(showTime) + "|" +
                        encode(screen) + "|" +
                        seatList + "|" +
                        totalAmount + "|" +
                        paymentMethod + "|" +
                        "CONFIRMED" + "|" +
                        System.currentTimeMillis() +
                        System.lineSeparator();

                Files.writeString(
                        BOOKING_FILE,
                        record,
                        StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE,
                        StandardOpenOption.APPEND);

                String response =
                        "{"
                        + "\"bookingId\":\"" + jsonEscape(bookingId) + "\","
                        + "\"movie\":\"" + jsonEscape(movieTitle) + "\","
                        + "\"movieId\":\"" + jsonEscape(movieId) + "\","
                        + "\"showDate\":\"" + jsonEscape(showDate) + "\","
                        + "\"showTime\":\"" + jsonEscape(showTime) + "\","
                        + "\"screen\":\"" + jsonEscape(screen) + "\","
                        + "\"seats\":\"" + jsonEscape(seatList) + "\","
                        + "\"amount\":" + totalAmount + ","
                        + "\"paymentMethod\":\"" + paymentMethod + "\","
                        + "\"status\":\"CONFIRMED\""
                        + "}";

                sendJson(exchange, 200, response);
            }

        } catch (Exception e) {
            logError(e);
            sendJson(exchange, 500,
                    "{\"error\":\"Unable to create booking. Please try again.\"}");
        }
    }


    // ==========================================
    // MY BOOKINGS
    // ==========================================

    private static void getMyBookings(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            sendJson(exchange, 405,
                    "{\"error\":\"Method not allowed.\"}");
            return;
        }

        try {

            String customerEmail = getLoggedInEmail(exchange);

            if (customerEmail == null) {
                sendJson(exchange, 401,
                        "{\"error\":\"Please login to view your bookings.\"}");
                return;
            }

            StringBuilder json = new StringBuilder("[");
            boolean first = true;

            synchronized (bookingLock) {

                if (Files.exists(BOOKING_FILE)) {

                    List<String> lines =
                            Files.readAllLines(BOOKING_FILE);

                    for (String line : lines) {

                        String[] data = line.split("\\|", -1);

                        if (data.length < 11) {
                            continue;
                        }

                        String savedEmail = decode(data[1]);

                        if (!savedEmail.equalsIgnoreCase(customerEmail)) {
                            continue;
                        }

                        String movieTitle = getMovieTitle(data[2]);

                        if (movieTitle == null) {
                            movieTitle = "Movie unavailable";
                        }

                        long timestamp;

                        try {
                            timestamp = Long.parseLong(data[10]);
                        } catch (Exception e) {
                            timestamp = 0;
                        }

                        int refundAmount = 0;

                        if (data[9].equals("CANCELLED")) {
                            try {
                                refundAmount =
                                        Integer.parseInt(data[7]) / 2;
                            } catch (Exception ignored) {
                                refundAmount = 0;
                            }
                        }

                        if (!first) {
                            json.append(",");
                        }

                        json.append("{")
                            .append("\"bookingId\":\"").append(jsonEscape(data[0])).append("\",")
                            .append("\"movieId\":\"").append(jsonEscape(data[2])).append("\",")
                            .append("\"movie\":\"").append(jsonEscape(movieTitle)).append("\",")
                            .append("\"showDate\":\"").append(jsonEscape(data[3])).append("\",")
                            .append("\"showTime\":\"").append(jsonEscape(decode(data[4]))).append("\",")
                            .append("\"screen\":\"").append(jsonEscape(decode(data[5]))).append("\",")
                            .append("\"seats\":\"").append(jsonEscape(data[6])).append("\",")
                            .append("\"amount\":").append(data[7]).append(",")
                            .append("\"paymentMethod\":\"").append(jsonEscape(data[8])).append("\",")
                            .append("\"status\":\"").append(jsonEscape(data[9])).append("\",")
                            .append("\"refundAmount\":").append(refundAmount).append(",")
                            .append("\"timestamp\":").append(timestamp)
                            .append("}");

                        first = false;
                    }
                }
            }

            json.append("]");

            sendJson(exchange, 200, json.toString());

        } catch (Exception e) {
            logError(e);
            sendJson(exchange, 500,
                    "{\"error\":\"Unable to retrieve bookings.\"}");
        }
    }


    // ==========================================
    // CANCEL BOOKING
    // ==========================================

    private static void cancelBooking(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
            sendJson(exchange, 405,
                    "{\"error\":\"Method not allowed.\"}");
            return;
        }

        try {

            String customerEmail = getLoggedInEmail(exchange);

            if (customerEmail == null) {
                sendJson(exchange, 401,
                        "{\"error\":\"Please login to cancel a booking.\"}");
                return;
            }

            Map<String, String> form = readForm(exchange);

            String bookingId =
                    form.getOrDefault("bookingId", "").trim();

            if (bookingId.isEmpty()) {
                sendJson(exchange, 400,
                        "{\"error\":\"Booking ID is required.\"}");
                return;
            }

            synchronized (bookingLock) {

                if (!Files.exists(BOOKING_FILE)) {
                    sendJson(exchange, 404,
                            "{\"error\":\"Booking not found.\"}");
                    return;
                }

                List<String> lines =
                        Files.readAllLines(BOOKING_FILE);

                List<String> updatedLines =
                        new ArrayList<>(lines);

                boolean found = false;
                int refundAmount = 0;

                for (int i = 0; i < lines.size(); i++) {

                    String[] data = lines.get(i).split("\\|", -1);

                    if (data.length < 11 ||
                            !data[0].equals(bookingId)) {
                        continue;
                    }

                    found = true;

                    String savedEmail = decode(data[1]);

                    if (!savedEmail.equalsIgnoreCase(customerEmail)) {
                        sendJson(exchange, 403,
                                "{\"error\":\"You cannot cancel another customer's booking.\"}");
                        return;
                    }

                    if (!data[9].equals("CONFIRMED")) {
                        sendJson(exchange, 400,
                                "{\"error\":\"This booking is already cancelled or is not active.\"}");
                        return;
                    }

                    LocalDateTime showDateTime;

                    try {
                        LocalDate date = LocalDate.parse(data[3]);

                        LocalTime time = LocalTime.parse(
                                decode(data[4]),
                                SHOW_TIME_FORMAT);

                        showDateTime = LocalDateTime.of(date, time);

                    } catch (Exception e) {
                        sendJson(exchange, 400,
                                "{\"error\":\"Unable to determine the show date and time.\"}");
                        return;
                    }

                    LocalDateTime cancellationDeadline =
                            showDateTime.minusHours(2);

                    if (!LocalDateTime.now().isBefore(cancellationDeadline)) {
                        sendJson(exchange, 400,
                                "{\"error\":\"Cancellation is allowed only more than 2 hours before the show.\"}");
                        return;
                    }

                    int originalAmount =
                            Integer.parseInt(data[7]);

                    refundAmount = originalAmount / 2;

                    data[9] = "CANCELLED";

                    updatedLines.set(i, String.join("|", data));

                    break;
                }

                if (!found) {
                    sendJson(exchange, 404,
                            "{\"error\":\"Booking not found.\"}");
                    return;
                }

                Files.write(
                        BOOKING_FILE,
                        updatedLines,
                        StandardCharsets.UTF_8,
                        StandardOpenOption.TRUNCATE_EXISTING,
                        StandardOpenOption.CREATE);

                String response =
                        "{"
                        + "\"message\":\"Booking cancelled successfully.\","
                        + "\"bookingId\":\"" + jsonEscape(bookingId) + "\","
                        + "\"status\":\"CANCELLED\","
                        + "\"refundAmount\":" + refundAmount
                        + "}";

                sendJson(exchange, 200, response);
            }

        } catch (Exception e) {
            logError(e);
            sendJson(exchange, 500,
                    "{\"error\":\"Unable to cancel booking.\"}");
        }
    }


    // ==========================================
    // VERIFY DIGITAL TICKET
    // ==========================================

    private static void verifyTicket(HttpExchange exchange)
            throws IOException {

        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            sendJson(exchange, 405,
                    "{\"error\":\"Method not allowed.\"}");
            return;
        }

        try {

            Map<String, String> params =
                    getQueryParameters(exchange);

            String bookingId =
                    params.getOrDefault("bookingId", "").trim();

            if (bookingId.isEmpty()) {
                sendJson(exchange, 400,
                        "{\"valid\":false,\"message\":\"Booking ID is required.\"}");
                return;
            }

            synchronized (bookingLock) {

                if (Files.exists(BOOKING_FILE)) {

                    for (String line : Files.readAllLines(BOOKING_FILE)) {

                        String[] data = line.split("\\|", -1);

                        if (data.length < 11 ||
                                !data[0].equals(bookingId)) {
                            continue;
                        }

                        String movieTitle = getMovieTitle(data[2]);

                        if (movieTitle == null) {
                            movieTitle = "Movie unavailable";
                        }

                        boolean valid = data[9].equals("CONFIRMED");

                        String response =
                                "{"
                                + "\"valid\":" + valid + ","
                                + "\"bookingId\":\"" + jsonEscape(data[0]) + "\","
                                + "\"movie\":\"" + jsonEscape(movieTitle) + "\","
                                + "\"showDate\":\"" + jsonEscape(data[3]) + "\","
                                + "\"showTime\":\"" + jsonEscape(decode(data[4])) + "\","
                                + "\"screen\":\"" + jsonEscape(decode(data[5])) + "\","
                                + "\"seats\":\"" + jsonEscape(data[6]) + "\","
                                + "\"status\":\"" + jsonEscape(data[9]) + "\","
                                + "\"message\":\"" +
                                    (valid ? "Valid CineBook ticket." :
                                             "This ticket is cancelled or invalid.")
                                + "\""
                                + "}";

                        sendJson(exchange, 200, response);
                        return;
                    }
                }
            }

            sendJson(exchange, 404,
                    "{\"valid\":false,\"message\":\"Ticket not found.\"}");

        } catch (Exception e) {
            logError(e);
            sendJson(exchange, 500,
                    "{\"valid\":false,\"message\":\"Unable to verify ticket.\"}");
        }
    }


    // ==========================================
    // GET MOVIE TITLE
    // ==========================================

    private static String getMovieTitle(String movieId)
            throws IOException {

        Path movieFile = Paths.get("data/movies.txt");

        if (!Files.exists(movieFile)) {
            return null;
        }

        for (String line : Files.readAllLines(movieFile)) {

            String[] movie = line.split("\\|", -1);

            if (movie.length == 6 &&
                    movie[0].equals(movieId)) {

                return movie[1];
            }
        }

        return null;
    }


    // ==========================================
    // GET LOGGED-IN CUSTOMER EMAIL
    // ==========================================

    private static String getLoggedInEmail(HttpExchange exchange) {

        String sessionId = getSessionId(exchange);

        if (sessionId == null) {
            return null;
        }

        return sessions.get(sessionId);
    }


    // ==========================================
    // GET URL QUERY PARAMETERS
    // ==========================================

    private static Map<String, String> getQueryParameters(
            HttpExchange exchange) {

        Map<String, String> params = new HashMap<>();

        String query = exchange.getRequestURI().getRawQuery();

        if (query == null) {
            return params;
        }

        for (String pair : query.split("&")) {

            String[] parts = pair.split("=", 2);

            String key = URLDecoder.decode(
                    parts[0], StandardCharsets.UTF_8);

            String value = parts.length > 1
                    ? URLDecoder.decode(
                            parts[1], StandardCharsets.UTF_8)
                    : "";

            params.put(key, value);
        }

        return params;
    }


    // ==========================================
    // JSON ESCAPING
    // ==========================================

    private static String jsonEscape(String value) {

        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }


    // ==========================================
    // SEND JSON RESPONSE
    // ==========================================

    private static void sendJson(
            HttpExchange exchange,
            int status,
            String message) throws IOException {

        byte[] response =
                message.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
                "Content-Type", "application/json; charset=UTF-8");

        exchange.sendResponseHeaders(status, response.length);

        try (OutputStream out = exchange.getResponseBody()) {
            out.write(response);
        }
    }


    // ==========================================
    // READ FORM DATA
    // ==========================================

    private static Map<String, String> readForm(
            HttpExchange exchange) throws IOException {

        String body = new String(
                exchange.getRequestBody().readAllBytes(),
                StandardCharsets.UTF_8);

        Map<String, String> form = new HashMap<>();

        for (String pair : body.split("&")) {

            String[] parts = pair.split("=", 2);

            String key = URLDecoder.decode(
                    parts[0], StandardCharsets.UTF_8);

            String value = parts.length > 1
                    ? URLDecoder.decode(
                            parts[1], StandardCharsets.UTF_8)
                    : "";

            form.put(key, value);
        }

        return form;
    }


    // ==========================================
    // READ SESSION COOKIE
    // ==========================================

    private static String getSessionId(HttpExchange exchange) {

        List<String> cookies =
                exchange.getRequestHeaders().get("Cookie");

        if (cookies == null) {
            return null;
        }

        for (String cookieHeader : cookies) {

            for (String cookie : cookieHeader.split(";")) {

                String[] parts = cookie.trim().split("=", 2);

                if (parts.length == 2 &&
                        parts[0].equals("CINEBOOK_SESSION")) {

                    return parts[1];
                }
            }
        }

        return null;
    }


    // ==========================================
    // BASE64 ENCODING
    // ==========================================

    private static String encode(String value) {

        return Base64.getEncoder().encodeToString(
                value.getBytes(StandardCharsets.UTF_8));
    }


    // ==========================================
    // BASE64 DECODING
    // ==========================================

    private static String decode(String value) {

        return new String(
                Base64.getDecoder().decode(value),
                StandardCharsets.UTF_8);
    }


    // ==========================================
    // PASSWORD HASHING
    // ==========================================

    private static String hashPassword(String password)
            throws Exception {

        MessageDigest digest =
                MessageDigest.getInstance("SHA-256");

        byte[] hash = digest.digest(
                password.getBytes(StandardCharsets.UTF_8));

        return Base64.getEncoder().encodeToString(hash);
    }


    // ==========================================
    // SEND TEXT RESPONSE
    // ==========================================

    private static void sendResponse(
            HttpExchange exchange,
            int status,
            String message) throws IOException {

        byte[] response =
                message.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
                "Content-Type", "text/plain; charset=UTF-8");

        exchange.sendResponseHeaders(status, response.length);

        try (OutputStream out = exchange.getResponseBody()) {
            out.write(response);
        }
    }


    // ==========================================
    // ERROR LOGGING
    // ==========================================

    private static void logError(Exception e) {

        try {
            Files.createDirectories(Paths.get("data"));

            Files.writeString(
                    Paths.get("data/error_log.txt"),
                    new Date() + " - " + e +
                            System.lineSeparator(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND);

        } catch (IOException ignored) {
            System.out.println("Unable to write error log.");
        }
    }
}
