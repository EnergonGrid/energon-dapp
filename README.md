# ENERGON DApp

This repository contains the user interface for the ENERGON protocol deployed on Flare Mainnet.

The interface surfaces on-chain state. It does not control protocol behavior.

---

## Position in EnergonGrid

The [EnergonGrid repository](https://github.com/EnergonGrid/EnergonGrid) is the umbrella architecture for the whole ecosystem. The DApp is an interface to the protocol, not a separate protocol or an administrator of deployed contracts.

| Layer | On-chain system | Documentation |
| --- | --- | --- |
| **Energon Core** | EON, EnergonCube, EnergonController | [Main architecture](https://github.com/EnergonGrid/EnergonGrid#energongrid-architecture) |
| **EMP / EVault** | Separately deployed Energon EVault economic contract | [Economic layer](https://github.com/EnergonGrid/EnergonGrid/blob/main/docs/evault.md) |
| **EPA / Energon Network** | Energon Network and project-specific adapters | [Integration layer](https://github.com/EnergonGrid/EnergonGrid/blob/main/docs/network.md) |

**EMP** means Energon Management Protocol; the EMP document and EVault contract are not interchangeable. **EPA** refers to project-specific Energon Project Adapters, not a single global contract address.

These links describe the broader architecture; they do **not** assert that this DApp currently implements every EVault or Network function. Any new transaction surface must be integrated and tested separately.

Frontend updates cannot bypass on-chain eligibility, reserve, claim, adapter, or timing rules.

---

## Surfaces

### Mint
The Mint surface allows wallets to mint Energon Cubes.

Eligibility for protocol participation is enforced on-chain.
Minting more than one cube does not increase access and may exclude the wallet from participation.

---

### Dashboard
The Dashboard is an observer surface.

It displays protocol state, including:
- Energon Height
- Eligibility status
- Timing constraints

The Dashboard does not imply rewards and does not provide strategy.

---

### Observer
The Observer is a visual-only surface.

It reflects protocol state without enabling interaction.
It exists to be watched, not optimized.

---

## Canon

The Whitepaper and Energon Management Protocol (EMP) describe the protocol framework. Actual behavior is enforced by the deployed smart contracts and live on-chain state.

If documentation or interface presentation differs from deployed contract execution, the deployed contracts are the source of truth.

User interfaces do not override protocol rules.
// feb 1 live marker
