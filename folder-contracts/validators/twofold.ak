// PREPROD TEST-ONLY: single-owner lending liquidity vault.
// This is NOT a multi-depositor ERC-4626/CIP-68 product: shares are ledger
// accounting units, not tradable tokens. No automated credit or guaranteed yield.
// Never accept public funds before collateral, admission, loss and exit audits.
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address}
use cardano/assets
use cardano/assets.{AssetName, PolicyId}
use cardano/script_context.{ScriptContext}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}

pub type VaultDatum {
  owner: VerificationKeyHash,
  operator: VerificationKeyHash,
  owner_address: Address,
  cash_micros: Int,
  outstanding_micros: Int,
  shares_micros: Int,
  reserve_bps: Int,
  maximum_utilisation_bps: Int,
  nonce: Int,
}

pub type VaultAction {
  Supply(Int)
  Redeem(Int)
  Lend(Int, Address)
  Repay(Int, Int)
  Close
}

fn paid_to(outputs: List<Output>, address: Address, policy: PolicyId, asset: AssetName) -> Int {
  list.foldl(outputs, 0, fn(output, sum) {
    if output.address == address {
      sum + assets.quantity_of(output.value, policy, asset)
    } else {
      sum
    }
  })
}

fn new_shares(cash: Int, debt: Int, shares: Int, amount: Int) -> Int {
  if shares == 0 {
    amount
  } else if cash + debt <= 0 {
    0
  } else {
    amount * shares / (cash + debt)
  }
}

fn redeem_value(cash: Int, debt: Int, shares: Int, burn: Int) -> Int {
  if shares <= 0 {
    0
  } else {
    burn * (cash + debt) / shares
  }
}

fn safe_liquidity(cash: Int, debt: Int, reserve: Int, max_util: Int) -> Bool {
  let assets = cash + debt
  and {
    cash >= 0,
    debt >= 0,
    assets > 0,
    cash * 10000 >= assets * reserve,
    debt * 10000 <= assets * max_util,
  }
}

fn next_state(
  outputs: List<Output>,
  script_address: Address,
  previous: VaultDatum,
  cash: Int,
  debt: Int,
  shares: Int,
  policy: PolicyId,
  token: AssetName,
) -> Bool {
  when list.find(outputs, fn(output) { output.address == script_address }) is {
    None -> False
    Some(output) ->
      when output.datum is {
        InlineDatum(raw) ->
          if raw is VaultDatum {
            and {
              raw.owner == previous.owner,
              raw.operator == previous.operator,
              raw.owner_address == previous.owner_address,
              raw.cash_micros == cash,
              raw.outstanding_micros == debt,
              raw.shares_micros == shares,
              raw.reserve_bps == previous.reserve_bps,
              raw.maximum_utilisation_bps == previous.maximum_utilisation_bps,
              raw.nonce == previous.nonce + 1,
              assets.quantity_of(output.value, policy, token) == cash,
            }
          } else {
            False
          }
        _ -> False
      }
  }
}

validator twofold(quote_policy: PolicyId, quote_asset: AssetName) {
  spend(
    optional_datum: Option<VaultDatum>,
    action: VaultAction,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = optional_datum
    expect Some(own_input) =
      list.find(self.inputs, fn(input) { input.output_reference == own_ref })
    let script_address = own_input.output.address
    let owner_signed = list.has(self.extra_signatories, datum.owner)
    let operator_signed = list.has(self.extra_signatories, datum.operator)
    let current_cash = assets.quantity_of(own_input.output.value, quote_policy, quote_asset)
    let total = datum.cash_micros + datum.outstanding_micros
    let input_is_solo =
      list.count(self.inputs, fn(input) { input.output.address == script_address }) == 1
    let continuations =
      list.count(self.outputs, fn(output) { output.address == script_address })
    let valid_base = and {
      datum.owner != datum.operator,
      datum.cash_micros >= 0,
      datum.outstanding_micros >= 0,
      datum.shares_micros >= 0,
      datum.cash_micros == current_cash,
      datum.shares_micros <= total,
      datum.nonce >= 0,
      datum.reserve_bps >= 100,
      datum.reserve_bps <= 5000,
      datum.maximum_utilisation_bps >= 100,
      datum.maximum_utilisation_bps <= 9500,
      datum.reserve_bps + datum.maximum_utilisation_bps <= 10000,
      input_is_solo,
    }
    when action is {
      Supply(amount) -> {
        let minted = new_shares(
          datum.cash_micros,
          datum.outstanding_micros,
          datum.shares_micros,
          amount,
        )
        and {
          valid_base,
          owner_signed,
          amount > 0,
          minted > 0,
          continuations == 1,
          next_state(
            self.outputs,
            script_address,
            datum,
            datum.cash_micros + amount,
            datum.outstanding_micros,
            datum.shares_micros + minted,
            quote_policy,
            quote_asset,
          ),
        }
      }
      Redeem(burn) -> {
        let payout = redeem_value(
          datum.cash_micros,
          datum.outstanding_micros,
          datum.shares_micros,
          burn,
        )
        let remaining_cash = datum.cash_micros - payout
        and {
          valid_base,
          owner_signed,
          burn > 0,
          burn <= datum.shares_micros,
          payout > 0,
          datum.cash_micros >= payout,
          // Existing borrowers' liability must not be hidden by share redemptions.
          safe_liquidity(
            remaining_cash,
            datum.outstanding_micros,
            datum.reserve_bps,
            datum.maximum_utilisation_bps,
          ),
          continuations == 1,
          paid_to(self.outputs, datum.owner_address, quote_policy, quote_asset) >= payout,
          next_state(
            self.outputs,
            script_address,
            datum,
            remaining_cash,
            datum.outstanding_micros,
            datum.shares_micros - burn,
            quote_policy,
            quote_asset,
          ),
        }
      }
      Lend(amount, recipient) -> {
        let remaining_cash = datum.cash_micros - amount
        let increased_debt = datum.outstanding_micros + amount
        and {
          valid_base,
          owner_signed,
          operator_signed,
          amount > 0,
          datum.cash_micros >= amount,
          recipient != script_address,
          recipient != datum.owner_address,
          continuations == 1,
          safe_liquidity(
            remaining_cash,
            increased_debt,
            datum.reserve_bps,
            datum.maximum_utilisation_bps,
          ),
          paid_to(self.outputs, recipient, quote_policy, quote_asset) >= amount,
          next_state(
            self.outputs,
            script_address,
            datum,
            remaining_cash,
            increased_debt,
            datum.shares_micros,
            quote_policy,
            quote_asset,
          ),
        }
      }
      Repay(principal, interest) ->
        and {
          valid_base,
          owner_signed,
          operator_signed,
          principal > 0,
          principal <= datum.outstanding_micros,
          interest >= 0,
          continuations == 1,
          next_state(
            self.outputs,
            script_address,
            datum,
            datum.cash_micros + principal + interest,
            datum.outstanding_micros - principal,
            datum.shares_micros,
            quote_policy,
            quote_asset,
          ),
        }
      Close ->
        and {
          valid_base,
          owner_signed,
          datum.outstanding_micros == 0,
          continuations == 0,
          paid_to(self.outputs, datum.owner_address, quote_policy, quote_asset) >= datum.cash_micros,
        }
    }
  }

  else(_ctx: ScriptContext) {
    False
  }
}

test initial_deposit_mints_one_to_one_shares() {
  new_shares(0, 0, 0, 1000000) == 1000000
}

test earning_pool_mints_fewer_new_shares() {
  new_shares(1200000, 0, 1000000, 600000) == 500000
}

test cannot_lend_below_cash_reserve() {
  !safe_liquidity(100000, 900000, 2000, 8000)
}

test cannot_lend_above_maximum_utilisation() {
  !safe_liquidity(100000, 900000, 500, 8000)
}

test withdrawal_accounts_for_unrepaid_debt() {
  redeem_value(700000, 300000, 1000000, 200000) == 200000
}
