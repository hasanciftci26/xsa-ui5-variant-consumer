/*eslint no-console: 0*/
"use strict";

const xsjs = require("@sap/async-xsjs");
const xsenv = require("@sap/xsenv");
const port = process.env.PORT || 3000;

const express = require("express");
const expressPromiseRouter = require("express-promise-router");
const xsHDBConn = require("@sap/hdbext");

const xssec = require("@sap/xssec");
const passport = require("passport");
const bodyParser = require("body-parser");

global.appRoot = __dirname;

let options = {
	auditLog: {
		logToConsole: true
	}, // change to auditlog service for productive scenarios
	redirectUrl: "/index.xsjs"
};

// configure HANA
try {
	options = Object.assign(options, xsenv.getServices({
		hana: {
			plan: "hdi-shared"
		}
	}));
	
	console.log(options);
} catch (err) {
	console.log("[WARN]", err.message);
}

// configure UAA
try {
	options = Object.assign(options, xsenv.getServices({
		uaa: {
			name: "personalization_api_consumer_auth"
		}
	}));
} catch (err) {
	console.log("[WARN]", err.message);
}

let xsjsApp = xsjs(options);

// initialize Express App for XSA UAA and HDBEXT Middleware
let expressApp = express();
let expressPromiseRouterApp = expressPromiseRouter();

expressApp.use(expressPromiseRouterApp);

expressApp.use(bodyParser.urlencoded({
	extended: true
}));
expressApp.use(bodyParser.json({
	limit: "50MB"
}));
expressApp.use(bodyParser.raw());

// authentication Module Configuration
passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		name: "personalization_api_consumer_auth"
	}
}).uaa));
expressApp.use(passport.initialize());
expressApp.use(passport.authenticate("JWT", {
	session: false
}));

// use custom hdb connection
expressApp.use(xsHDBConn.middleware(options.hana));

async function startExpressApp(_port) {
	// add xsjs to express
	expressApp.use(await xsjsApp);
	// start app listen
	expressApp.listen(_port, function () {
		console.log("Server listening on port %d", _port);
	});
}

startExpressApp(port);