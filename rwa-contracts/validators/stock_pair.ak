// Experimental test-only bilateral stock-linked position escrow.
// Distinct build generation: DO NOT merge this script into the five pinned core validators.
// This validator is NOT deployed. Needs audit before signing real Preprod txs.
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval
use cardano/address.{Address}
use cardano/assets
use cardano/assets.{PolicyId, AssetName}
use cardano/script_context.{ScriptContext}
use cardano/transaction.{Output,OutputReference,Transaction}

pub type StockPairDatum {
  long_owner: VerificationKeyHash,
  short_owner: VerificationKeyHash,
  long_address: Address,
  short_address: Address,
  ticker: ByteArray,
  long_collateral: Int,
  short_collateral: Int,
  size_micro_shares: Int,
  entry_price_micros: Int,
  nonce: Int,
}
pub type StockPairAction {
  Settle(Int, Int)
  MutualRefund
}

fn payout(total:Int,long_margin:Int,size:Int,entry:Int,mark:Int)->Int {
 let marked_long=long_margin + size * (mark - entry) / 1000000
 if marked_long < 0 {0} else if marked_long > total {total} else {marked_long}
}
fn paid_to(outputs:List<Output>,recipient:Address,policy:PolicyId,asset:AssetName)->Int {
 list.foldl(outputs,0,fn(output,sum) {
   if output.address == recipient {sum + assets.quantity_of(output.value,policy,asset)} else {sum}
 })
}
validator stock_pair(
 oracle_a:VerificationKeyHash,
 oracle_b:VerificationKeyHash,
 settlement_keeper:VerificationKeyHash,
 quote_policy:PolicyId,
 quote_asset:AssetName,
) {
 spend(optional_datum:Option<StockPairDatum>, action:StockPairAction, own_ref:OutputReference, self:Transaction) {
  expect Some(datum)=optional_datum
  expect Some(own_input)=list.find(self.inputs,fn(input){input.output_reference==own_ref})
  let total=datum.long_collateral + datum.short_collateral
  let actual=assets.quantity_of(own_input.output.value,quote_policy,quote_asset)
  let own_script_input_count=list.count(self.inputs,fn(input){input.output.address==own_input.output.address})
  let own_script_output_count=list.count(self.outputs,fn(output){output.address==own_input.output.address})
  let valid_base=and {
   datum.long_owner != datum.short_owner,
   oracle_a != oracle_b,
   datum.long_address != datum.short_address,
   datum.long_collateral > 0,
   datum.short_collateral > 0,
   datum.entry_price_micros > 0,
   datum.size_micro_shares > 0,
   datum.nonce >= 0,
   datum.ticker == "AAPL" || datum.ticker == "NVDA",
   actual == total,
   own_script_input_count == 1,
   own_script_output_count == 0,
  }
  when action is {
   MutualRefund -> and {
    valid_base,
    list.has(self.extra_signatories, datum.long_owner),
    list.has(self.extra_signatories, datum.short_owner),
    paid_to(self.outputs,datum.long_address,quote_policy,quote_asset)==datum.long_collateral,
    paid_to(self.outputs,datum.short_address,quote_policy,quote_asset)==datum.short_collateral,
   }
   Settle(mark_price,attested_at_ms) -> {
    expect mark_price > 0
    expect attested_at_ms > 0
    let long_return=payout(total,datum.long_collateral,datum.size_micro_shares,datum.entry_price_micros,mark_price)
    let short_return=total-long_return
    and {
     valid_base,
     list.has(self.extra_signatories,oracle_a),
     list.has(self.extra_signatories,oracle_b),
     list.has(self.extra_signatories,settlement_keeper),
     self.validity_range |> interval.contains(attested_at_ms),
     paid_to(self.outputs,datum.long_address,quote_policy,quote_asset)==long_return,
     paid_to(self.outputs,datum.short_address,quote_policy,quote_asset)==short_return,
    }
   }
  }
 }
 else(_ctx:ScriptContext){False}
}

test returns_long_collateral_when_price_unchanged() {
 payout(2000000,1000000,1000000,260000000,260000000)==1000000
}
test capped_long_profit_cannot_take_more_than_locked_quote() {
 payout(2000000,1000000,1000000,260000000,900000000)==2000000
}
test capped_long_loss_cannot_be_negative() {
 payout(2000000,1000000,1000000,260000000,1)==0
}
