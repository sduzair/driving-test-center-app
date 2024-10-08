const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const uniqueValidator = require("mongoose-unique-validator");

const UserSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			unique: [true, "Username taken"],
			required: [true, "Please provide a username"],
			trim: true,
		},
		password: {
			type: String,
			required: [true, "Please provide a password"],
		},
		userType: {
			type: String,
			enum: {
				values: ["Driver", "Examiner", "Admin"],
			},
			required: true,
		},
	},
	{
		versionKey: false,
	},
);

UserSchema.plugin(uniqueValidator);

UserSchema.pre("save", function (next) {
	bcrypt.hash(
		this.password,
		Number.parseInt(process.env.BCRYPT_SALT_ROUNDS),
		(error, hash) => {
			this.password = hash;
			next();
		},
	);

	// bcrypt.hash(driver.DOB, 10, (error, hash) => {
	// 	driver.DOB = hash
	// 	next()
	// })
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
