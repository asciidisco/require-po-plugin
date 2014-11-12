/*global define */
define(function () {
	"use strict";
	return function (n) {
		if (n === 0) {
			return "none";
		}
		if (n === 1) {
			return "one";
		}
		return "other";
	};
});