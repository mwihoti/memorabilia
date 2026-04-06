use starknet::ContractAddress;

/// Session policy stored per account.
/// Arrays are not supported in Dojo model fields — limits use primitive types.
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct SessionPolicy {
    #[key]
    pub account_address: ContractAddress,
    /// Max fee allowed per transaction (in smallest unit).
    pub max_fee: u128,
    /// Unix timestamp when the session expires.
    pub expires_at: u64,
    /// Whether this session is still active.
    pub is_active: bool,
    /// Number of contracts registered for this session (informational).
    pub allowed_count: u8,
}

#[generate_trait]
pub impl SessionPolicyImpl of SessionPolicyTrait {
    fn new(
        account_address: ContractAddress,
        max_fee: u128,
        expires_at: u64
    ) -> SessionPolicy {
        SessionPolicy {
            account_address,
            max_fee,
            expires_at,
            is_active: true,
            allowed_count: 0,
        }
    }

    fn is_valid(self: @SessionPolicy, current_time: u64) -> bool {
        *self.is_active && current_time < *self.expires_at
    }

    fn deactivate(ref self: SessionPolicy) {
        self.is_active = false;
    }
}
