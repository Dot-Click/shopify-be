import { env } from "@/utils/env.util";
const gocardless = require("gocardless-nodejs");
import constants from "gocardless-nodejs/constants";

const client = gocardless(env.GC_ACCESS_TOKEN, constants.Environments.Sandbox);

export default client;
