// @ts-nocheck
import axios from "axios";
import { GetMinuteStartNowTimestampUTC, GenerateRandomColor } from "./tool.js";
import { marked } from "marked";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

dotenv.config();

const GH_TOKEN = process.env.GH_TOKEN;

const GhNotConfiguredMsg =
	"Github owner or repo or GH_TOKEN is undefined. Read the docs to configure github: https://kener.ing/docs/gh-setup/";
/**
 * @param {any} url
 */
function getAxiosOptions(url) {
	const options = {
		url: url,
		method: "GET",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: "Bearer " + GH_TOKEN,
			"X-GitHub-Api-Version": "2022-11-28"
		}
	};
	return options;
}
function postAxiosOptions(url, data) {
	const options = {
		url: url,
		method: "POST",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: "Bearer " + GH_TOKEN,
			"X-GitHub-Api-Version": "2022-11-28"
		},
		data: data
	};
	return options;
}
function patchAxiosOptions(url, data) {
	const options = {
		url: url,
		method: "PATCH",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: "Bearer " + GH_TOKEN,
			"X-GitHub-Api-Version": "2022-11-28"
		},
		data: data
	};
	return options;
}

const GetAllGHLabels = async function (site) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return [];
	}
	const options = getAxiosOptions(
		`${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/labels?per_page=1000`
	);

	let labels = [];
	try {
		const response = await axios.request(options);
		labels = response.data.map((label) => label.name);
	} catch (error) {
		console.log(error.response?.data);
		return [];
	}
	return labels;
};

const CreateGHLabel = async function (site, label, description, color) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	if (color === undefined) {
		color = GenerateRandomColor();
	}

	const options = postAxiosOptions(
		`${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/labels`,
		{
			name: label,
			color: color,
			description: description
		}
	);
	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return null;
	}
};
const GetStartTimeFromBody = function (text) {
	const pattern = /\[start_datetime:(\d+)\]/;

	const matches = pattern.exec(text);

	if (matches) {
		const timestamp = matches[1];
		return parseInt(timestamp);
	}
	return null;
};
const GetEndTimeFromBody = function (text) {
	const pattern = /\[end_datetime:(\d+)\]/;

	const matches = pattern.exec(text);

	if (matches) {
		const timestamp = matches[1];
		return parseInt(timestamp);
	}
	return null;
};
const GetIncidentByNumber = async function (site, incidentNumber) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues/${incidentNumber}`;
	const options = getAxiosOptions(url);
	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		console.log(error.message, options, url);
		return null;
	}
};
const GetIncidents = async function (site, tagName, state = "all") {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return [];
	}
	if (tagName === undefined) {
		return [];
	}
	const since = GetMinuteStartNowTimestampUTC() - site.github.incidentSince * 60 * 60;
	const sinceISO = new Date(since * 1000).toISOString();
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues?state=${state}&labels=${tagName},incident&sort=created&direction=desc&since=${sinceISO}`;
	const options = getAxiosOptions(url);
	try {
		const response = await axios.request(options);
		let issues = response.data;
		//issues.createAt should be after sinceISO
		issues = issues.filter((issue) => {
			return new Date(issue.created_at) >= new Date(sinceISO);
		});
		return issues;
	} catch (error) {
		console.log(error.response?.data);
		return [];
	}
};
const GetIncidentsManual = async function (site, tagName, state = "all") {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return [];
	}
	if (tagName === undefined) {
		return [];
	}
	const since = GetMinuteStartNowTimestampUTC() - site.github.incidentSince * 60 * 60;
	const sinceISO = new Date(since * 1000).toISOString();
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues?state=${state}&labels=${tagName},incident,manual&sort=created&direction=desc&since=${sinceISO}`;
	const options = getAxiosOptions(url);
	try {
		const response = await axios.request(options);
		let issues = response.data;
		//issues.createAt should be after sinceISO
		issues = issues.filter((issue) => {
			return new Date(issue.created_at) >= new Date(sinceISO);
		});
		return issues;
	} catch (error) {
		console.log(error.response?.data);
		return [];
	}
};
const GetOpenIncidents = async function (site) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return [];
	}

	const since = GetMinuteStartNowTimestampUTC() - site.github.incidentSince * 60 * 60;
	const sinceISO = new Date(since * 1000).toISOString();
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues?state=open&labels=incident&sort=created&direction=desc&since=${sinceISO}`;
	const options = getAxiosOptions(url);
	try {
		const response = await axios.request(options);
		let issues = response.data;
		//issues.createAt should be after sinceISO
		issues = issues.filter((issue) => {
			return new Date(issue.created_at) >= new Date(sinceISO);
		});
		return issues;
	} catch (error) {
		console.log(error.response?.data);
		return [];
	}
};
function FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive) {
	let openIncidentExploded = [];
	for (let i = 0; i < openIncidentsReduced.length; i++) {
		for (let j = 0; j < monitorsActive.length; j++) {
			if (openIncidentsReduced[i].labels.includes(monitorsActive[j].tag)) {
				let incident = JSON.parse(JSON.stringify(openIncidentsReduced[i]));
				incident.monitor = {
					name: monitorsActive[j].name,
					tag: monitorsActive[j].tag,
					image: monitorsActive[j].image,
					description: monitorsActive[j].description
				};
				openIncidentExploded.push(incident);
			}
		}
	}
	return openIncidentExploded;
}
function Mapper(issue) {
	const html = marked.parse(issue.body);

	//convert issue.created_at from iso to timestamp  UTC minutes
	const issueCreatedAt = new Date(issue.created_at);
	const issueCreatedAtTimestamp = issueCreatedAt.getTime() / 1000;

	//convert issue.closed_at from iso to timestamp UTC minutes
	let issueClosedAtTimestamp = null;
	if (issue.closed_at !== null) {
		const issueClosedAt = new Date(issue.closed_at);
		issueClosedAtTimestamp = issueClosedAt.getTime() / 1000;
	}

	let labels = issue.labels.map(function (label) {
		return label.name;
	});
	//find and add monitors tag in labels

	let res = {
		title: issue.title,
		incident_start_time: GetStartTimeFromBody(issue.body) || issueCreatedAtTimestamp,
		incident_end_time: GetEndTimeFromBody(issue.body) || issueClosedAtTimestamp,
		number: issue.number,
		body: html,
		created_at: issue.created_at,
		updated_at: issue.updated_at,
		collapsed: true,
		// @ts-ignore
		state: issue.state,
		closed_at: issue.closed_at,
		// @ts-ignore
		labels: labels,
		html_url: issue.html_url,
		comments: []
	};

	return res;
}
async function GetCommentsForIssue(site, issueID) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return [];
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues/${issueID}/comments`;
	try {
		const response = await axios.request(getAxiosOptions(url));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return [];
	}
}
async function CreateIssue(site, issueTitle, issueBody, issueLabels) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues`;
	try {
		const payload = {
			title: issueTitle,
			body: issueBody,
			labels: issueLabels
		};
		const response = await axios.request(postAxiosOptions(url, payload));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return null;
	}
}
async function UpdateIssue(
	site,
	incidentNumber,
	issueTitle,
	issueBody,
	issueLabels,
	state = "open"
) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues/${incidentNumber}`;
	try {
		const payload = {
			title: issueTitle,
			body: issueBody,
			labels: issueLabels,
			state: state
		};
		const response = await axios.request(patchAxiosOptions(url, payload));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return null;
	}
}
async function CloseIssue(site, incidentNumber) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues/${incidentNumber}`;
	try {
		const payload = {
			state: "closed"
		};
		const response = await axios.request(patchAxiosOptions(url, payload));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return null;
	}
}
async function AddComment(site, incidentNumber, commentBody) {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues/${incidentNumber}/comments`;
	try {
		const payload = {
			body: commentBody
		};
		const response = await axios.request(postAxiosOptions(url, payload));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return null;
	}
}
//update issue labels
async function UpdateIssueLabels(site, incidentNumber, issueLabels, body, state = "open") {
	if (!site.hasGithub || GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}
	const url = `${site.github.apiURL}/repos/${site.github.owner}/${site.github.repo}/issues/${incidentNumber}`;
	try {
		const payload = {
			labels: issueLabels,
			body: body,
			state: state
		};
		const response = await axios.request(patchAxiosOptions(url, payload));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return null;
	}
}

//search issue
async function SearchIssue(site, query, page, per_page) {
	if (GH_TOKEN === undefined) {
		console.warn(GhNotConfiguredMsg);
		return null;
	}

	const searchQuery = query
		.filter(function (q) {
			if (q == "" || q === undefined || q === null) {
				return false;
			}
			const qs = q.split(":");
			if (qs.length < 2) {
				return false;
			}
			if (qs[1] === "" || qs[1] === undefined || qs[1] === null) {
				return false;
			}
			return true;
		})
		.join(" ");

	const url = `${site.github.apiURL}/search/issues?q=${encodeURIComponent(
		searchQuery
	)}&per_page=${per_page}&page=${page}`;

	try {
		const response = await axios.request(getAxiosOptions(url));
		return response.data;
	} catch (error) {
		console.log(error.response.data);
		return [];
	}
}

export {
	GetAllGHLabels,
	CreateGHLabel,
	GetIncidents,
	GetStartTimeFromBody,
	GetEndTimeFromBody,
	GetCommentsForIssue,
	Mapper,
	CreateIssue,
	AddComment,
	GetIncidentByNumber,
	UpdateIssueLabels,
	UpdateIssue,
	CloseIssue,
	GetOpenIncidents,
	FilterAndInsertMonitorInIncident,
	SearchIssue,
	GetIncidentsManual
};
