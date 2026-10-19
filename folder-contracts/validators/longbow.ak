// PREPROD TEST-ONLY: fixed-debt escrow for synthetic stock-reference collateral.
// Not legally backed stock, not audited, and not active until independently
// reviewed, parameterized, funded and proven with Cardano Preprod receipts.
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval
use cardano/address.{Address}
use cardano/assets
use cardano/assets.{AssetName, PolicyId}
use cardano/script_context.{ScriptContext}
use cardano/transaction.{Output, OutputReference, Transaction}

pub type LoanDatum {
  borrower: VerificationKeyHash,
  lender: VerificationKeyHash,
  borrower_address: Address,
  lender_address: Address,
  collateral_micro_shares: Int,
  principal_micros: Int,
  fixed_interest_micros: Int,
  liquidation_ltv_bps: Int,
  due_ms: Int,
  nonce: Int,
}

pub type LoanAction {
  Repay
  Liquidate(Int, Int)
  ExpiredSeizure
  MutualCancel
}

fn asset_paid_to(
  outputs: List<Output>,
  recipient: Address,
  policy: PolicyId,
  name: AssetName,
) -> Int {
  list.foldl(outputs, 0, fn(output, amount) {
    if output.address == recipient {
      amount + assets.quantity_of(output.value, policy, name)
    } else {
      amount
    }
  })
}

fn undercollateralised(
  collateral_micro_shares: Int,
  mark_price_micros: Int,
  liquidation_ltv_bps: Int,
  debt_micros: Int,
) -> Bool {
  collateral_micro_shares > 0 &&
    mark_price_micros > 0 &&
    liquidation_ltv_bps > 0 &&
    debt_micros > 0 &&
    collateral_micro_shares * mark_price_micros * liquidation_ltv_bps <
      debt_micros * 1000000 * 10000
}

validator longbow(
  collateral_policy: PolicyId,
  collateral_asset: AssetName,
  quote_policy: PolicyId,
  quote_asset: AssetName,
  oracle_signer: VerificationKeyHash,
  keeper_signer: VerificationKeyHash,
) {
  spend(
    optional_datum: Option<LoanDatum>,
    action: LoanAction,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = optional_datum
    expect Some(own_input) =
      list.find(self.inputs, fn(input) { input.output_reference == own_ref })
    let collateral_on_script =
      assets.quantity_of(own_input.output.value, collateral_policy, collateral_asset)
    let due = datum.principal_micros + datum.fixed_interest_micros
    let borrower_signed = list.has(self.extra_signatories, datum.borrower)
    let lender_signed = list.has(self.extra_signatories, datum.lender)
    let solo_input =
      list.count(self.inputs, fn(input) { input.output.address == own_input.output.address }) == 1
    let closed =
      list.count(self.outputs, fn(output) { output.address == own_input.output.address }) == 0
    let base_ok = and {
      collateral_policy != quote_policy || collateral_asset != quote_asset,
      datum.borrower != datum.lender,
      datum.borrower_address != datum.lender_address,
      datum.collateral_micro_shares > 0,
      datum.collateral_micro_shares == collateral_on_script,
      datum.principal_micros > 0,
      datum.fixed_interest_micros >= 0,
      datum.liquidation_ltv_bps >= 100,
      datum.liquidation_ltv_bps <= 9500,
      datum.due_ms > 0,
      datum.nonce >= 0,
      solo_input,
      closed,
    }
    when action is {
      Repay ->
        and {
          base_ok,
          borrower_signed,
          asset_paid_to(self.outputs, datum.borrower_address, collateral_policy, collateral_asset) ==
            datum.collateral_micro_shares,
          asset_paid_to(self.outputs, datum.lender_address, quote_policy, quote_asset) >= due,
        }
      MutualCancel ->
        and {
          base_ok,
          borrower_signed,
          lender_signed,
          asset_paid_to(self.outputs, datum.borrower_address, collateral_policy, collateral_asset) ==
            datum.collateral_micro_shares,
        }
      ExpiredSeizure ->
        and {
          base_ok,
          lender_signed,
          self.validity_range |> interval.is_entirely_after(datum.due_ms),
          asset_paid_to(self.outputs, datum.lender_address, collateral_policy, collateral_asset) ==
            datum.collateral_micro_shares,
        }
      Liquidate(mark_price_micros, attested_at_ms) ->
        and {
          base_ok,
          lender_signed,
          list.has(self.extra_signatories, oracle_signer),
          list.has(self.extra_signatories, keeper_signer),
          attested_at_ms > 0,
          self.validity_range |> interval.contains(attested_at_ms),
          undercollateralised(
            datum.collateral_micro_shares,
            mark_price_micros,
            datum.liquidation_ltv_bps,
            due,
          ),
          asset_paid_to(self.outputs, datum.lender_address, collateral_policy, collateral_asset) ==
            datum.collateral_micro_shares,
        }
    }
  }

  else(_ctx: ScriptContext) {
    False
  }
}

test healthy_collateral_cannot_be_liquidated() {
  !undercollateralised(10000000, 200000000, 6500, 800000000)
}

test underwater_collateral_can_be_flagged() {
  undercollateralised(10000000, 100000000, 6500, 800000000)
}

test zero_mark_is_never_valid_evidence() {
  !undercollateralised(10000000, 0, 6500, 800000000)
}
