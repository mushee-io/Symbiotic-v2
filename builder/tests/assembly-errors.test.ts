import assert from "node:assert/strict";
import test from "node:test";
import {publicBuilderError} from "../src/assembly-errors.js";

test("error classifications explain session expiry without leaking wallet context",()=>{
 assert.equal(publicBuilderError("/assemble",new Error("Unknown, expired or already used builder request")).code,"SIGNING_SESSION_EXPIRED");
 assert.equal(publicBuilderError("/assemble",new Error("Wallet did not provide a verification-key witness")).code,"SIGNATURE_REQUIRED");
 assert.equal(publicBuilderError("/assemble",new Error("No script or non-vkey witnesses allowed for self-test")).code,"WITNESS_INVALID");
 assert.equal(publicBuilderError("/assemble",new Error("Assembled transaction body changed")).code,"TRANSACTION_MISMATCH");
 const hidden=publicBuilderError("/assemble",new Error("secret=preprod1234 private-data"));
 assert.equal(hidden.code,"ASSEMBLY_INVALID");
 assert.ok(!JSON.stringify(hidden).includes("private-data"));
 assert.equal(publicBuilderError("/prepare",new Error("secret=private-data")).code,"BUILDER_REJECTED");
});
