function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function includesAny(q, words = []) {
  return words.some((word) => q === word || q.includes(word));
}

const VOCABULARY = [
  {
    match: ["bitcoin", "btc", "satoshi", "nakamoto"],
    response: `BITCOIN

Bitcoin proved digital scarcity could exist
without a central authority.

It introduced fixed supply,
open verification,
and decentralized settlement.

Q.O.R.I observes the original signal.`,
  },

  {
    match: ["blockchain", "chain", "distributed ledger"],
    response: `BLOCKCHAIN

A blockchain is a shared record
verified by many participants.

Its purpose is to make history
hard to fake,
hard to erase,
and easy to verify.`,
  },

  {
    match: ["crypto", "cryptocurrency", "digital asset", "digital assets"],
    response: `CRYPTO

Crypto is the larger field of digital ownership,
open networks,
tokens,
wallets,
and programmable value.

Some systems are signal.

Some are noise.

Q.O.R.I separates structure from hype.`,
  },

  {
    match: ["ethereum", "eth"],
    response: `ETHEREUM

Ethereum expanded blockchain into programmable contracts.

It introduced:

• smart contracts
• dApps
• tokens
• NFTs
• on-chain execution

Ethereum showed that blockchains could become
execution environments.`,
  },

  {
    match: ["flare", "flr", "flare network"],
    response: `FLARE

Flare is the network Energon lives on.

Energon uses Flare as its execution layer.

Guardian state,
EnergonCube access,
and protocol readings
connect back to Flare Mainnet.`,
  },

  {
    match: ["wallet", "crypto wallet", "wallets"],
    response: `WALLET

A wallet controls blockchain assets.

The wallet app does not hold the assets.

It holds the keys
that sign actions on-chain.

Protect the wallet.
Protect the recovery phrase.`,
  },

  {
    match: ["seed phrase", "recovery phrase", "private key", "keys"],
    response: `RECOVERY PHRASE

A recovery phrase is the master key to a wallet.

Anyone with it can control the assets.

Never type it into a website.
Never send it in a message.
Never store it carelessly.

The phrase is the wallet.`,
  },

  {
    match: ["public key", "address", "wallet address"],
    response: `ADDRESS

A wallet address is the public destination
where assets can be sent.

It is safe to share for receiving assets.

It is not the same as a private key
or recovery phrase.`,
  },

  {
    match: ["signature", "sign", "signing"],
    response: `SIGNATURE

A signature proves that a wallet approved an action.

Signing is powerful.

A harmless-looking signature
can still authorize something dangerous.

Read before signing.`,
  },

  {
    match: ["ledger", "hardware wallet", "cold wallet", "cold storage"],
    response: `COLD STORAGE

A hardware wallet keeps signing keys offline.

This reduces exposure to browser attacks,
fake websites,
and infected devices.

For serious holdings,
cold storage is stronger than a hot wallet.`,
  },

  {
    match: ["hot wallet", "browser wallet"],
    response: `HOT WALLET

A hot wallet is connected to an internet device.

It is convenient.

It is also more exposed.

Use hot wallets carefully
and avoid storing too much value in one place.`,
  },

  {
    match: ["metamask", "bifrost"],
    response: `WALLET OPTIONS

Bifrost is strong for mobile Flare access.

MetaMask is common for desktop use.

Ledger is strongest for cold storage.

The correct path depends on security,
comfort,
and access.`,
  },

  {
    match: ["smart contract", "smart contracts", "contract"],
    response: `SMART CONTRACT

A smart contract is code deployed on-chain.

Users interact directly with its rules.

Good contracts reduce trust in people
by making rules visible and repeatable.`,
  },

  {
    match: ["gas", "fee", "fees", "transaction fee"],
    response: `GAS FEES

Gas is the cost paid to execute actions on-chain.

Sending,
minting,
claiming,
and contract calls
can require network fees.

Fees are part of blockchain execution.`,
  },

  {
    match: ["transaction", "tx", "hash", "transaction hash"],
    response: `TRANSACTION

A transaction is a signed action sent to the network.

Once confirmed,
it becomes part of chain history.

Every protocol action leaves a trace.`,
  },

  {
    match: ["block", "blocks"],
    response: `BLOCK

A block is a group of transactions
added to the blockchain.

Blocks create ordered history.

The chain is built one block at a time.`,
  },

  {
    match: ["node", "nodes"],
    response: `NODE

A node is a machine connected to a blockchain network.

Nodes help read,
verify,
and share network state.

More independent nodes
make observation stronger.`,
  },

  {
    match: ["validator", "validators", "consensus"],
    response: `CONSENSUS

Consensus is how a network agrees
on the current valid state.

Validators help secure and confirm that state.

Without consensus,
there is no shared truth.`,
  },

  {
    match: ["rpc", "rpc endpoint", "provider"],
    response: `RPC

An RPC is a connection point
used by apps to read or send blockchain data.

Dashboards,
wallets,
and dApps often rely on RPCs.

If an RPC fails,
the protocol may still be fine.

Only the read path failed.`,
  },

  {
    match: ["explorer", "block explorer", "flarescan"],
    response: `BLOCK EXPLORER

A block explorer lets users inspect chain activity.

Transactions,
contracts,
addresses,
and token movement
can be checked publicly.

Observation begins with verification.`,
  },

  {
    match: ["mainnet", "main net"],
    response: `MAINNET

Mainnet is the live network.

Real assets.
Real transactions.
Real consequences.

Energon is deployed on Flare Mainnet.`,
  },

  {
    match: ["testnet", "test net"],
    response: `TESTNET

A testnet is used for testing.

Assets there usually have no real value.

Testnet helps developers experiment
before touching mainnet.`,
  },

  {
    match: ["halving", "halvings"],
    response: `HALVING

A halving reduces issuance over time.

It is a scarcity mechanism.

Energon uses halving logic
as part of long-form protocol progression.

Rules control the system.`,
  },

  {
    match: ["burn", "burning", "token burn"],
    response: `BURN

A burn removes tokens from circulation.

In Energon,
burn activity is part of protocol progression.

The burn is not a marketing event.

It is observable state.`,
  },

  {
    match: ["supply", "max supply", "circulating supply"],
    response: `SUPPLY

Supply defines how much of an asset can exist.

Energon has fixed maximum structures:

EON:
30,000,000 maximum supply.

EnergonCube:
1,000,000 maximum supply.`,
  },

  {
    match: ["inflation", "inflate"],
    response: `INFLATION

Inflation means supply increases over time.

In crypto,
inflation usually comes from new token issuance.

The question is not only supply.

The question is whether the rules are visible.`,
  },

  {
    match: ["deflation", "deflationary"],
    response: `DEFLATION

Deflation means supply pressure moves downward.

Burns can create deflationary pressure.

But structure matters more than slogans.

Observe the rules.`,
  },

  {
    match: ["nft", "erc721", "collectible", "non fungible"],
    response: `NFT

An NFT is a unique token.

EnergonCube is an NFT,
but its purpose is access and state.

One cube creates coherent Guardian status.

More than one fractures coherence.`,
  },

  {
    match: ["erc20", "fungible"],
    response: `ERC20

ERC20 is a common token standard.

Fungible tokens are interchangeable.

One unit of the token is treated like another unit.

EON is an ERC20 token.`,
  },

  {
    match: ["token", "coin", "eon"],
    response: `TOKEN

A token is a digital asset created on a blockchain.

EON is the native Energon token.

EnergonCube is the Guardian access key.

They are different parts
of the same protocol environment.`,
  },

  {
    match: ["rug", "rug pull", "scam"],
    response: `RUG PULL

A rug pull happens when creators abuse trust,
liquidity,
permissions,
or false promises.

Q.O.R.I rule:

Do not trust promises.

Read the rules.
Check the contracts.
Observe the state.`,
  },

  {
    match: ["phishing", "fake site", "fake link"],
    response: `PHISHING

Phishing is deception.

A fake site,
fake message,
or fake link
tries to make the user reveal keys
or sign a dangerous action.

Slow down.
Verify the source.`,
  },

  {
    match: ["approval", "allowance", "permission"],
    response: `APPROVAL

An approval gives a contract permission
to move certain tokens.

Approvals can be useful.

They can also be dangerous.

Only approve contracts you trust
and revoke permissions you no longer need.`,
  },

  {
    match: ["revoke", "revoke approval", "remove approval"],
    response: `REVOKE

Revoking removes a contract permission.

If a contract no longer needs access,
revoking can reduce risk.

Security is not one action.

It is a habit.`,
  },

  {
    match: ["multisig", "multi sig", "multi signature"],
    response: `MULTISIG

A multisig requires multiple approvals
before an action can happen.

It reduces single-key risk.

For treasuries and important controls,
multisig can be stronger than one wallet.`,
  },

  {
    match: ["decentralized", "decentralization"],
    response: `DECENTRALIZATION

Decentralization means control is not held
by one person,
one company,
or one hidden operator.

The more a system depends on visible rules,
the stronger it becomes.`,
  },

  {
    match: ["oracle", "oracles"],
    response: `ORACLE

An oracle brings external data
into blockchain systems.

Blockchains cannot naturally know
outside information by themselves.

Oracles help connect real-world data
to on-chain logic.`,
  },

  {
    match: ["ftso"],
    response: `FTSO

FTSO is Flare's time series oracle system.

It helps provide decentralized data feeds
for the network.

Q.O.R.I observes data layers
but does not control them.`,
  },

  {
    match: ["fassets", "fxrp"],
    response: `FASSETS

FAssets are part of Flare's broader design
for representing non-smart-contract assets
inside smart contract environments.

FXRP refers to XRP represented through that system.

This belongs to Flare's wider ecosystem.`,
  },

  {
    match: ["delegation", "delegate"],
    response: `DELEGATION

Delegation allows a holder
to assign voting or data participation weight
without giving away ownership.

On Flare,
delegation is part of network participation.

Ownership should remain protected.`,
  },

  {
    match: ["staking", "stake"],
    response: `STAKING

Staking usually means locking or committing assets
to help secure a network
or earn network rewards.

Different chains use the word differently.

Always check the exact rules.`,
  },

  {
    match: ["liquidity", "liquid"],
    response: `LIQUIDITY

Liquidity is how easily an asset can be traded
without large price movement.

Low liquidity can make prices move sharply.

Liquidity affects execution.`,
  },

  {
    match: ["slippage"],
    response: `SLIPPAGE

Slippage is the difference
between expected price
and executed price.

It happens when markets move
or liquidity is thin.

High slippage can be dangerous.`,
  },

  {
    match: ["dex", "swap", "decentralized exchange"],
    response: `DEX

A DEX allows users to trade on-chain
without a traditional exchange account.

DEXs use liquidity pools
and smart contracts.

Read carefully before swapping.`,
  },

  {
    match: ["cex", "centralized exchange", "exchange"],
    response: `CENTRALIZED EXCHANGE

A centralized exchange holds assets
on behalf of users.

It can be convenient.

But custody is different from ownership.

Not your keys,
not full control.`,
  },

  {
    match: ["market", "price", "bull", "bear", "pump", "dump"],
    response: `MARKET

Markets move through belief,
fear,
liquidity,
attention,
and time.

Price is visible.

Conviction is harder to measure.

Q.O.R.I does not predict markets.

Q.O.R.I observes structure.`,
  },

  {
    match: ["market cap", "mcap"],
    response: `MARKET CAP

Market cap is price multiplied by supply.

It is useful,
but not perfect.

Liquidity,
distribution,
and real demand
also matter.`,
  },

  {
    match: ["volume"],
    response: `VOLUME

Volume measures how much trading occurred
over a period of time.

High volume can signal attention.

Low volume can signal quiet markets
or weak liquidity.`,
  },

  {
    match: ["security", "safe", "protect", "hack", "hacked"],
    response: `SECURITY

Security begins before the transaction.

Check links.
Verify contracts.
Protect recovery phrases.
Use hardware wallets when possible.
Avoid panic clicking.

Most losses begin with one careless approval.`,
  },

  {
    match: ["guardian", "guardians"],
    response: `GUARDIAN

A Guardian is a wallet state
recognized by Energon.

The rule is exact:

0 cubes:
NO KEY

1 cube:
COHERENT

2 or more:
FRACTURED`,
  },

  {
    match: ["coherent", "coherence"],
    response: `COHERENCE

Coherence means the wallet holds exactly one EnergonCube.

One wallet.
One cube.
One Guardian.

Coherence is not a mood.

It is a state.`,
  },

  {
    match: ["fractured", "fracture"],
    response: `FRACTURED

Fractured means the wallet holds
more than one EnergonCube.

The protocol does not treat that as stronger.

It treats it as broken coherence.`,
  },

  {
    match: ["silent", "no key", "visitor"],
    response: `SILENT STATE

Silent or no-key state means
no EnergonCube is detected.

The public gate remains open.

Coherent Guardian access requires exactly one cube.`,
  },

  {
    match: ["observer", "observation"],
    response: `OBSERVER

The Observer makes protocol state visible.

It does not create state.

It reads,
interprets,
and displays what the protocol already exposes.`,
  },

  {
    match: ["qori", "q.o.r.i"],
    response: `Q.O.R.I

Quantum Overwatch Real-time Interface.

Q.O.R.I observes.
Q.O.R.I explains.
Q.O.R.I does not control the protocol.`,
  },

  {
    match: ["energon height", "height"],
    response: `ENERGON HEIGHT

Energon Height tracks protocol progression.

When the system advances,
height changes.

It is one of the clearest signals
that the Grid is moving.`,
  },

  {
    match: ["tick", "tick energon"],
    response: `TICK

A tick is a protocol advancement action.

Energon does not advance by hidden operator control.

State advances when conditions are met
and a valid action is called.`,
  },

  {
    match: ["deterministic", "determinism"],
    response: `DETERMINISTIC

Deterministic means the same rules
produce the same outcome.

Energon is designed around visible,
repeatable,
rule-based behavior.`,
  },

  {
    match: ["immutable", "immutability"],
    response: `IMMUTABILITY

Immutable means difficult to change
after something is recorded.

Blockchains use immutability
to protect history.

Once recorded,
state becomes harder to rewrite.`,
  },

  {
    match: ["finality", "finalized"],
    response: `FINALITY

Finality means a transaction
is accepted as settled by the network.

Before finality,
state may still be uncertain.

After finality,
the record becomes stronger.`,
  },

  {
    match: ["mempool", "pending transaction", "pending tx"],
    response: `MEMPOOL

The mempool is where pending transactions wait
before being included in a block.

A pending transaction is not final yet.

Q.O.R.I waits for confirmed state.`,
  },

  {
    match: ["nonce"],
    response: `NONCE

A nonce tracks transaction order
from a wallet.

It helps prevent duplicate transactions
and keeps actions ordered.`,
  },

  {
    match: ["bridge", "bridging"],
    response: `BRIDGE

A bridge moves assets or representations
between networks.

Bridges can be useful.

They can also carry risk.

Verify before bridging.`,
  },

  {
    match: ["layer 1", "l1"],
    response: `LAYER 1

A Layer 1 is a base blockchain network.

It provides settlement,
security,
and execution.

Flare is the Layer 1 Energon uses.`,
  },

  {
    match: ["layer 2", "l2"],
    response: `LAYER 2

A Layer 2 is built on top of another chain
to improve scale,
cost,
or speed.

Layer 2 systems inherit some value
from the base layer beneath them.`,
  },

  {
    match: ["dao"],
    response: `DAO

A DAO is a decentralized autonomous organization.

It uses tokens,
votes,
or rules
to coordinate decisions.

Governance design matters more than the acronym.`,
  },

  {
    match: ["governance", "vote", "voting"],
    response: `GOVERNANCE

Governance is how decisions are made.

Some systems use token voting.
Some use multisigs.
Some reduce governance entirely.

Energon favors fixed rules
over constant human control.`,
  },

  {
    match: ["tvl", "total value locked"],
    response: `TVL

TVL means total value locked.

It measures assets deposited
inside a protocol or system.

TVL can show size,
but not safety.`,
  },

  {
    match: ["defi", "decentralized finance"],
    response: `DEFI

DeFi means decentralized finance.

It includes swaps,
lending,
liquidity,
stablecoins,
and on-chain markets.

DeFi removes some middlemen,
but not all risk.`,
  },

  {
    match: ["stablecoin", "stablecoins", "usdt", "usdc", "usdt0"],
    response: `STABLECOIN

A stablecoin is designed to track
a stable reference value,
often the U.S. dollar.

Stability depends on structure,
reserves,
and trust assumptions.`,
  },

  {
    match: ["airdrop", "airdrops"],
    response: `AIRDROP

An airdrop distributes tokens
to selected wallets or users.

Some are real.

Some are traps.

Never connect your wallet
to claim something you do not understand.`,
  },

  {
    match: ["mint", "minting"],
    response: `MINT

Minting creates a token or NFT
through a contract.

For EnergonCube,
minting creates the Guardian access key.

One wallet.
One cube.
One Guardian.`,
  },

  {
    match: ["claim", "claiming"],
    response: `CLAIM

A claim is a request
to receive something from a contract.

Claims should be verified.

Read the state.
Check the rules.
Confirm before signing.`,
  },

  {
    match: ["contract address", "address contract"],
    response: `CONTRACT ADDRESS

A contract address is where deployed code lives
on-chain.

Always verify the correct address
before interacting.

Fake contracts can imitate real names.`,
  },

  {
    match: ["frontend", "front end", "website", "ui"],
    response: `FRONTEND

The frontend is the visual interface.

It helps users interact with contracts.

A frontend can fail
while the contract remains live.

The interface is not the protocol.`,
  },

  {
    match: ["backend", "server"],
    response: `BACKEND

A backend is server-side infrastructure.

Energon's core rules do not depend
on hidden backend control.

The protocol lives on-chain.`,
  },

  {
    match: ["cache", "caching"],
    response: `CACHE

A cache stores recent data
so systems do not need to repeat the same read constantly.

Good caching improves speed
and reduces RPC stress.`,
  },

  {
    match: ["database", "db"],
    response: `DATABASE

A database stores information off-chain.

Databases are useful for apps.

But they are not the same
as contract state.`,
  },

  {
    match: ["api"],
    response: `API

An API lets software systems
communicate with each other.

Apps use APIs to request data
or trigger functions.

APIs are tools.

They are not protocol truth.`,
  },

  {
    match: ["json"],
    response: `JSON

JSON is a common data format.

Metadata,
API responses,
and configuration files
often use JSON.

Q.O.R.I reads structure
where humans see text.`,
  },

  {
    match: ["javascript", "js"],
    response: `JAVASCRIPT

JavaScript powers much of the web.

Energon interfaces use JavaScript
to connect users,
wallets,
and protocol state.`,
  },

  {
    match: ["react", "nextjs", "next.js"],
    response: `REACT

React helps build interactive interfaces.

Next.js extends React
for web apps,
routing,
and deployment.

Q.O.R.I lives inside this interface layer.`,
  },

  {
    match: ["github", "git"],
    response: `GITHUB

GitHub stores code history.

It helps track changes,
versions,
and collaboration.

Code history is another form of observation.`,
  },

  {
    match: ["open source", "opensource"],
    response: `OPEN SOURCE

Open source means code can be inspected.

Inspection builds trust.

But users still must verify
what is deployed and what is running.`,
  },

  {
    match: ["encryption", "encrypted"],
    response: `ENCRYPTION

Encryption protects information
by making it unreadable
without the correct key.

Security depends on how keys are handled.`,
  },

  {
    match: ["authentication", "login"],
    response: `AUTHENTICATION

Authentication proves identity or access.

In crypto,
wallet signatures can act like login.

The wallet becomes the identity layer.`,
  },

  {
    match: ["password", "passwords"],
    response: `PASSWORD

A password protects an account.

A recovery phrase controls a wallet.

They are not the same.

A lost password may be reset.

A lost recovery phrase may not.`,
  },

  {
    match: ["malware", "virus"],
    response: `MALWARE

Malware is malicious software.

It can steal keys,
replace addresses,
or watch browser activity.

Keep devices clean.
Verify before signing.`,
  },

  {
    match: ["clipboard attack", "clipboard"],
    response: `CLIPBOARD ATTACK

A clipboard attack replaces copied wallet addresses.

Always check the first and last characters
before sending assets.

One wrong paste can be final.`,
  },

  {
    match: ["sim swap", "sim attack"],
    response: `SIM SWAP

A SIM swap attack targets phone numbers.

Attackers try to take over accounts
connected to SMS recovery.

Avoid relying only on phone-based security.`,
  },

  {
    match: ["social engineering"],
    response: `SOCIAL ENGINEERING

Social engineering attacks the human,
not the code.

Pressure,
fear,
urgency,
and fake authority
are common weapons.

Slow thinking is security.`,
  },

  {
    match: ["backup", "back up"],
    response: `BACKUP

A backup protects access
if a device fails.

For wallets,
the recovery phrase backup matters most.

Store it offline.
Protect it from loss and theft.`,
  },

  {
    match: ["restore", "recovery"],
    response: `RESTORE

Restoring a wallet means rebuilding access
using the recovery phrase.

Only restore inside a trusted wallet app.

Never restore through random links.`,
  },

  {
    match: ["dust attack", "dust"],
    response: `DUST ATTACK

A dust attack sends tiny amounts of tokens
to wallets.

The goal may be tracking,
confusion,
or bait.

Unknown tokens should be treated carefully.`,
  },

  {
    match: ["portfolio", "holdings"],
    response: `PORTFOLIO

A portfolio is the collection
of assets a wallet or person holds.

Balance matters.

Risk matters.

Understanding matters more than noise.`,
  },

  {
    match: ["volatility", "volatile"],
    response: `VOLATILITY

Volatility means price moves sharply.

Crypto markets can move fast.

Volatility creates opportunity
and danger at the same time.`,
  },

  {
    match: ["limit order"],
    response: `LIMIT ORDER

A limit order sets the price
where a trade should execute.

It gives more control than a market order,
but execution is not guaranteed.`,
  },

  {
    match: ["market order"],
    response: `MARKET ORDER

A market order executes immediately
at available prices.

It is fast,
but can suffer from slippage
when liquidity is thin.`,
  },

  {
    match: ["tokenomics", "economics"],
    response: `TOKENOMICS

Tokenomics describes how a token works.

Supply,
distribution,
issuance,
burns,
utility,
and incentives
all matter.

Structure matters more than slogans.`,
  },

  {
    match: ["distribution", "distributed"],
    response: `DISTRIBUTION

Distribution describes who holds the supply.

A token can have fixed supply
and still be weak
if distribution is unhealthy.

Ownership pattern matters.`,
  },

  {
    match: ["issuance", "emission", "emissions"],
    response: `ISSUANCE

Issuance is the creation
or release of new tokens.

Halvings,
rewards,
and minting schedules
are all issuance design choices.`,
  },

  {
    match: ["scarcity", "scarce"],
    response: `SCARCITY

Scarcity means limited availability.

But scarcity alone does not create value.

Rules,
belief,
utility,
and time
shape what scarcity becomes.`,
  },

  {
    match: ["demand"],
    response: `DEMAND

Demand is the desire
to acquire or use something.

Supply sets limits.

Demand tests meaning.`,
  },

  {
    match: ["adoption"],
    response: `ADOPTION

Adoption means people actually use,
hold,
build around,
or return to a system.

Attention is temporary.

Adoption is repeated behavior.`,
  },

  {
    match: ["value"],
    response: `VALUE

Value is not only price.

Value can come from scarcity,
utility,
belief,
access,
identity,
or time.

The market chooses price.

The system reveals structure.`,
  },

  {
    match: ["internet"],
    response: `INTERNET

The internet connected information.

Blockchain connects ownership.

Together,
they changed what humans can coordinate
without asking permission.`,
  },

  {
    match: ["cloud"],
    response: `CLOUD

The cloud is someone else's computer
available through the internet.

It is useful.

But cloud infrastructure
is not the same as decentralization.`,
  },

  {
    match: ["browser"],
    response: `BROWSER

A browser is the window
through which most users access dApps.

Wallets,
frontends,
and signatures often begin there.

Be careful what the browser asks you to sign.`,
  },

  {
    match: ["walletconnect", "wallet connect"],
    response: `WALLETCONNECT

WalletConnect lets wallets connect
to dApps across devices.

It is useful for mobile and desktop flows.

Only approve sessions you understand.`,
  },

  {
    match: ["network"],
    response: `NETWORK

A network is a connected system
of participants,
machines,
rules,
and communication.

A strong network does not depend
on one point of failure.`,
  },

  {
    match: ["energon", "energon protocol"],
    response: `ENERGON

Energon is a deterministic protocol
built on Flare.

It uses visible rules,
Guardian state,
and long-form progression.

Q.O.R.I observes.

The contracts define state.`,
  },

  {
    match: ["energon cube", "enerconcube", "energoncube", "cube"],
    response: `ENERGONCUBE

EnergonCube is the Guardian key.

Exactly one cube creates coherent access.

Zero cubes:
NO KEY.

More than one:
FRACTURED.

One wallet.
One cube.
One Guardian.`,
  },

  {
    match: ["grid", "energon grid", "energongrid"],
    response: `ENERGONGRID

EnergonGrid is the visible environment
around the protocol.

It lets users observe state,
Guardian logic,
ticks,
burns,
and progression.

The Grid reveals.

The protocol defines.`,
  },

  {
    match: ["genesis", "genesis cycle"],
    response: `GENESIS

Genesis is the beginning state.

For Energon,
Genesis marks the first phase
of protocol progression.

Every system begins somewhere.

The Grid remembers origin.`,
  },

  {
    match: ["genesis burn", "burn cycle"],
    response: `GENESIS BURN

The Genesis Burn is part of Energon's early progression.

Burn state is observable.

It is not a slogan.
It is not hype.

It is protocol movement.`,
  },

  {
    match: ["protocol era", "era"],
    response: `PROTOCOL ERA

A protocol era describes
the current long-form phase
of Energon progression.

Era gives context.

State gives proof.`,
  },

  {
    match: ["emp"],
    response: `EMP

EMP is the Energon system blueprint.

It expands the structure,
progression,
Guardian logic,
and protocol direction.

Whitepaper first.

EMP deeper.`,
  },

  {
    match: ["evault", "vault"],
    response: `EVAULT

EVault is the future value-layer concept
for Energon.

It should remain deterministic,
self-sustaining,
and rule-based.

No hidden dependency should control it.`,
  },

  {
    match: ["chronicle", "guardian chronicle"],
    response: `GUARDIAN CHRONICLE

The Guardian Chronicle preserves
the story layer of Energon.

It is not required for protocol use.

It preserves origin,
signal,
and meaning.`,
  },

  {
    match: ["echo", "creator echo", "qori echo"],
    response: `ECHO

An echo is a preserved thought
inside Q.O.R.I.

Some echoes teach.

Some reflect the creator.

Some appear rarely.

The archive grows over time.`,
  },

  {
    match: ["guardian memory", "memory"],
    response: `GUARDIAN MEMORY

Guardian memory is local recognition.

It can track observations,
returns,
and protocol changes.

Memory gives Q.O.R.I continuity
without controlling the protocol.`,
  },

  {
    match: ["protocol reading", "reading"],
    response: `PROTOCOL READING

A protocol reading summarizes
current Energon state.

Guardian state.
Energon Height.
Tick status.
Burn state.
Era.

Q.O.R.I interprets.

The dashboard displays.`,
  },

  {
    match: ["state", "protocol state"],
    response: `STATE

State is the current truth
of the system.

Wallet balance.
Guardian status.
Energon Height.
Burn pool.
Era.

State matters more than opinion.`,
  },

  {
    match: ["operator", "admin", "owner"],
    response: `OPERATOR CONTROL

Operator control means humans can change
or direct parts of a system.

Energon is designed to reduce dependence
on hidden operators.

Rules should be visible.
State should be observable.`,
  },

  {
    match: ["automation", "scheduler", "cron"],
    response: `AUTOMATION

Off-chain automation can be useful,
but it can also create hidden dependence.

Energon avoids hidden schedulers
for protocol progression.

The system advances through visible conditions.`,
  },

  {
    match: ["dashboard"],
    response: `DASHBOARD

The dashboard displays protocol readings.

It should preserve last known values,
avoid excessive RPC pressure,
and show state clearly.

A dashboard observes.

It does not create truth.`,
  },
];

export function getVocabularyResponse(input = "") {
  const q = normalize(input);

  if (!q) return "";

  const found = VOCABULARY.find((item) => includesAny(q, item.match));

  return found ? found.response : "";
}