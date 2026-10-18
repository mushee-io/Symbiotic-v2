/**
 * Deliberately narrow public diagnostics: never reflect arbitrary errors,
 * CBOR contents, UTxOs, API credentials, or wallet addresses to callers.
 */
export type BuilderFailureCode =
 | "SIGNING_SESSION_EXPIRED"
 | "SIGNATURE_REQUIRED"
 | "WITNESS_INVALID"
 | "TRANSACTION_MISMATCH"
 | "ASSEMBLY_INVALID"
 | "BUILDER_REJECTED";
export function publicBuilderError(route:string|undefined,error:unknown):{error:string;code:BuilderFailureCode}{
 if(route!=="/assemble")
  return {error:"Builder request rejected; check local operator logs",code:"BUILDER_REJECTED"};
 const message=error instanceof Error?error.message:"";
 if(/Unknown, expired or already used builder request|Prepared transaction CBOR changed|already used|expired/i.test(message))
  return {error:"Wallet signing session expired or was already used. Start a new self-test.",code:"SIGNING_SESSION_EXPIRED"};
 if(/Wallet did not provide a verification-key witness|verification-key/i.test(message))
  return {error:"Wallet did not return a required payment signature.",code:"SIGNATURE_REQUIRED"};
 if(/No script or non-vkey witnesses allowed|witness/i.test(message))
  return {error:"Wallet returned a witness set this ADA-only self-test cannot accept.",code:"WITNESS_INVALID"};
 if(/Transaction body changed|Assembled transaction body changed/i.test(message))
  return {error:"Signed transaction does not match the prepared self-test.",code:"TRANSACTION_MISMATCH"};
 return {error:"Could not assemble wallet signature. Check Ubuntu builder logs for the exact cause.",code:"ASSEMBLY_INVALID"};
}
