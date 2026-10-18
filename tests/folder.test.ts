import assert from "node:assert/strict";
import test from "node:test";
import {FOLDER_PRODUCTS,FOLDER_EXECUTION_ENABLED,getFolderProduct} from "../lib/folder-products";
test("Folder owns two independent products",()=>{
 assert.deepEqual(FOLDER_PRODUCTS.map(p=>p.id),["longbow","twofold"]);
 assert.deepEqual(FOLDER_PRODUCTS.map(p=>p.path),["/folder/longbow","/folder/twofold"]);
 assert.equal(getFolderProduct("longbow")?.name,"Longbow");
 assert.equal(getFolderProduct("twofold")?.name,"Twofold");
 assert.equal(getFolderProduct("unknown"),undefined);
});
test("Both modules fail closed until product and risk rules are approved",()=>{
 assert.equal(FOLDER_EXECUTION_ENABLED,false);
 for(const p of FOLDER_PRODUCTS){
  assert.equal(p.status,"DESIGN_PENDING");
  assert.equal(p.transactionsEnabled,false);
  assert.equal(p.network,"preprod");
  assert.ok(p.features.length>=4);
  assert.ok(p.features.every(f=>f.status==="PLANNED"));
 }
});
