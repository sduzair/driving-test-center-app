const express = require("express");
const path = require("node:path");
const ejs = require("ejs");
//for database
const mongoose = require("mongoose");
//for form multimedia data
const fileUpload = require("express-fileupload");
// for user session
const expressSession = require("express-session");
const flash = require("connect-flash");
// for development environment variables
// ! comment this line for dev env variables before deployment
require("dotenv").config();

module.exports = {
	PORT = 3000,
	NODE_ENV = "development",
	CLUSTER_URL,
	DB_NAME,
	DB_USERNAME,
	DB_PASSWORD,

	SESS_NAME = "sid",
	SESS_SECRET,
	SESS_LIFETIME = 1000 * 60 * 60 * 24 * 365, // 365 days
	BCRYPT_SALT_ROUNDS = 10,
} = process.env;

const __isprod__ = NODE_ENV === "production";

//middleware for validation
//importing controllers
const driverFetch = require("./controllers/driverFetch");
const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
//for form data from POST request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(
	expressSession({
		name: SESS_NAME,
		resave: false,
		saveUninitialized: false,
		secret: SESS_SECRET,
		cookie: {
			maxAge: Number.parseInt(SESS_LIFETIME),
			sameSite: true,
			secure: __isprod__,
		},
	}),
);
app.use(flash());

app.use("/users/signup", require("./middleware/validateSignup"));
app.use("/users/login", require("./middleware/validateLogin"));
// todo: add auth middleware
app.use(
	"/drivers/bookAppointment",
	require("./middleware/driverAdminAuthentication"),
);

global.loggedIn = null;
app.use("*", (req, _res, next) => {
	loggedIn = req.session.userType;
	next();
});

//mongodb database
// todo postfix to uri ?retryWrites=true&w=majority
mongoose.connect(
	`mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${CLUSTER_URL}/${DB_NAME}`,
	{
		useNewUrlParser: true,
	},
);

// routing
// driver authentication prevents any user other than 'Driver' from access
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

app.listen(Number.parseInt(PORT), () => {
	console.log(`Listening on port: ${PORT}`);
	if (NODE_ENV === "development")
		console.log(`Server running on localhost:${PORT}`);
});
