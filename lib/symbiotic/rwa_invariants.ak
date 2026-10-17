// Testable safety predicates for FUTURE stock-linked derivatives.
// This is NOT a deployed validator and CANNOT authorize live orders.
// Existing five-validator script hashes remain pinned and untouched.
use aiken/fuzz

pub fn bounded_order_cross(buy_limit: Int, sell_limit: Int, execution_price: Int) -> Bool {
 and {buy_limit > 0, sell_limit > 0, execution_price >= sell_limit, execution_price <= buy_limit}
}
pub fn exact_fill(quantity: Int, buy_remaining: Int, sell_remaining: Int) -> Bool {
 and {quantity > 0, buy_remaining >= quantity, sell_remaining >= quantity}
}
pub fn collateral_conserved(locked: Int, buyer: Int, seller: Int, fee: Int) -> Bool {
 and {locked >= 0, buyer >= 0, seller >= 0, fee >= 0, buyer + seller + fee == locked}
}
test bounded_buy_sell_limits() {
 bounded_order_cross(260, 250, 255) && !bounded_order_cross(250, 260, 255)
}
test partial_fill_cannot_exceed_locked_amount() {
 exact_fill(3, 3, 5) && !exact_fill(4, 3, 5)
}
test payouts_cannot_exceed_locked_collateral() {
 collateral_conserved(1000, 400, 590, 10) && !collateral_conserved(1000, 400, 600, 10)
}
test prop_crossing(price via fuzz.int()) {
 if price > 0 {
  bounded_order_cross(price, price, price)
 } else {
  True
 }
}
