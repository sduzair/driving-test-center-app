const express = require("express");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const flash = require("connect-flash");
const pino = require("pino");
const pinoHttp = require("pino-http");
require("dotenv").config();
const path = require("node:path");

// Env variables
const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;
const {
	PORT = 3000,
	NODE_ENV = "development",

	MONGODB_PROTOCOL = "mongodb",
	MONGODB_HOST = "127.0.0.1",
	MONGODB_PORT = 27017,
	MONGODB_DATABASE = "abc_driving_center",
	MONGODB_USERNAME,
	MONGODB_PASSWORD,
	MONGODB_URI,

	SESS_NAME = "sid",
	SESS_SECRET,
	SESS_LIFETIME = SEVEN_DAYS,
	BCRYPT_SALT_ROUNDS = 10,
} = process.env;

const __isprod__ = NODE_ENV === "production";

// Configure Pino structured logging
const logger = pino();
const httpLogger = __isprod__
	? pinoHttp({ logger })
	: pinoHttp({
			logger,
			serializers: {
				req: (req) => {
					return {
						method: req.method,
						url: req.url,
						headers: req.headers,
						body: req.body, // Serialize the entire request body
					};
				},
				res: (res) => {
					return {
						statusCode: res.statusCode,
						headers: res.getHeaders(),
						body: res.body, // Serialize the entire response body
					};
				},
			},
			wrapSerializers: false, // Use raw values directly
		});

module.exports = {
	PORT,
	NODE_ENV,
	MONGODB_PROTOCOL,
	MONGODB_HOST,
	MONGODB_PORT,
	MONGODB_DATABASE,
	MONGODB_USERNAME,
	MONGODB_PASSWORD,
	MONGODB_URI,
	SESS_NAME,
	SESS_SECRET,
	SESS_LIFETIME, // 7 days
	BCRYPT_SALT_ROUNDS,
	logger,
};

// Create express app
const app = express();

// Middleware setup
global.loggedIn = null;
app
	.set("view engine", "ejs")
	.set("views", path.join(__dirname, "views"))
	.use(express.static("public"))
	.use(express.json())
	.use(express.urlencoded({ extended: true }))
	.use(fileUpload())
	.use(
		session({
			name: SESS_NAME,
			resave: false,
			saveUninitialized: false,
			secret: SESS_SECRET,
			cookie: {
				maxAge: Number.parseInt(SESS_LIFETIME),
				sameSite: true,
				secure: __isprod__,
			},
			store: new MemoryStore({
				checkPeriod: Number.parseInt(SESS_LIFETIME),
			}),
			proxy: true,
		}),
	)
	.use(flash())
	.use(httpLogger)
	.use("/users/signup", require("./middleware/validateSignup"))
	.use("/users/login", require("./middleware/validateLogin"))
	.use(
		"/drivers/bookAppointment",
		require("./middleware/driverAdminAuthentication"),
	)
	.use("*", (req, _res, next) => {
		loggedIn = req.session.userType;
		next();
	});

// Mongodb setup
mongoose
	.set("strictQuery", false)
	.set("debug", (collectionName, methodName, ...methodArgs) => {
		logger.info(`${collectionName}.${methodName}(${methodArgs.join(", ")})`);
	})
	.connect(
		(() => {
			// Function to construct MongoDB URI. Standard mongodb uri format:
			// mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]].
			// Format when using DNS SRV:
			// mongodb+srv://[username:password@]host[/[database][?options]]
			if (MONGODB_URI) {
				return MONGODB_URI; // Use the full URI if provided
			}

			let uri = `${MONGODB_PROTOCOL}://`;

			// Add authentication if username and password are provided
			if (MONGODB_USERNAME && MONGODB_PASSWORD) {
				uri += `${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@`;
			}

			// Add host
			uri += MONGODB_HOST;

			// Add port if not using SRV and port is specified
			if (MONGODB_PROTOCOL !== "mongodb+srv" && MONGODB_PORT) {
				uri += `:${MONGODB_PORT}`;
			}

			// Add database name
			if (MONGODB_DATABASE) {
				uri += `/${MONGODB_DATABASE}`;
			}

			return uri;
		})(),
		{
			useNewUrlParser: true,
		},
	);

app.post(
	"/drivers/updateG2Driver",
	require("./middleware/driverAuthentication"),
	require("./controllers/driverG2Update"),
);

app.post(
	"/drivers/updateGDriver",
	require("./middleware/driverAuthentication"),
	require("./controllers/driverGUpdate"),
);

// app.post( "/driver/driver-details", driverAuthentication, driverFetch )

app.post(
	"/drivers/recordDriver",
	require("./middleware/driverAuthentication"),
	require("./controllers/driverNew"),
);

app.get("/", require("./controllers/home"));

app.get("/index", require("./controllers/home"));

app.get(
	"/drivers/dashboard-page",
	require("./middleware/driverAuthentication"),
	require("./controllers/pageDashboard"),
);

app.get(
	"/drivers/g2-page",
	require("./middleware/driverAuthentication"),
	require("./controllers/pageG2"),
);

app.get(
	"/drivers/g-page",
	require("./middleware/driverAuthentication"),
	require("./controllers/pageG"),
);

app.get(
	"/signup",
	require("./middleware/redirectIfAuthenticated"),
	require("./controllers/pageSignup"),
);

app.get(
	"/login",
	require("./middleware/redirectIfAuthenticated"),
	require("./controllers/pageLogin"),
);

app.post(
	"/users/signup",
	require("./middleware/redirectIfAuthenticated"),
	require("./controllers/userSignup"),
);

app.post(
	"/users/login",
	require("./middleware/redirectIfAuthenticated"),
	require("./controllers/userLogin"),
);

app.delete(
	"/users/delete",
	require("./middleware/userAuthentication"),
	require("./controllers/userDelete"),
);

app.get("/logout", require("./controllers/userLogout"));

app.get(
	"/admins/dashboard-page",
	require("./middleware/adminAuthentication"),
	require("./controllers/pageAdminDashboard"),
);

app.get(
	"/admins/appointment-page",
	require("./middleware/adminAuthentication"),
	require("./controllers/pageAdminAppointment"),
);

app.post(
	"/admins/appointments",
	require("./middleware/adminAuthentication"),
	require("./controllers/appointmentNew"),
);

app.get(
	"/admins/appointments/:month/:day/:year",
	require("./controllers/appointmentsFetch"),
);

app.get(
	"/admins/test-results-page",
	require("./middleware/adminAuthentication"),
	require("./controllers/pageTestResults"),
);

app.post(
	"/drivers/bookAppointment",
	require("./middleware/driverAuthentication"),
	require("./controllers/driverBookAppointment"),
);

app.get(
	"/examiners/dashboard",
	require("./middleware/examinerAuthentication"),
	require("./controllers/pageExaminerDashboard"),
);

app.get(
	"/examiners/appointments-page",
	require("./middleware/examinerAuthentication"),
	require("./controllers/pageAppointments"),
);

app.get(
	"/examiners/fetchAppointments/:filterType",
	require("./middleware/examinerAuthentication"),
	require("./controllers/examinerFetchByAptType"),
);

app.post(
	"/examiners/update/driver/feedback",
	require("./middleware/examinerAuthentication"),
	require("./controllers/driverFeedbackUpdate"),
);

app.use((_req, res) => res.render("notfound"));

// Error-handling middleware
app.use((err, req, res, next) => {
	logger.error(err); // Log the error with stack trace
	res.status(err.status || 500).send(err.message || "Internal Server Error");
});

app.listen(Number.parseInt(PORT), () => {
	logger.info(`Listening on port: ${PORT}`);
	if (NODE_ENV === "development")
		logger.info(`Server running on localhost:${PORT}`);
});
