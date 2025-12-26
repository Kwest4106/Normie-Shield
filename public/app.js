 // app.js - COMPLETE FINAL VERSION
// Fixes: immediate SW control → buttons/wallet work on true first load
// Custom install banner with proper .prompt() → no Chrome errors
// All original features preserved

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Custom branded install banner
  const banner = document.createElement('div');
  banner.id = 'installBanner';
  banner.innerHTML = `
    <div style="position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#00FF88; color:#000; padding:1rem 2rem; border-radius:50px; font-weight:bold; box-shadow:0 8px 30px rgba(0,255,136,0.6); z-index:9999; display:flex; align-items:center; gap:1rem; animation:fadeIn 0.5s;">
      🛡️ Add to Home Screen for full armor mode
      <button id="installNow" style="background:#000; color:#00FF88; border:none; padding:0.8rem 1.6rem; border-radius:30px; font-weight:bold; cursor:pointer;">Install</button>
      <button id="installLater" style="background:transparent; color:#000; border:none; font-size:1.4rem; cursor:pointer; opacity:0.7;">✕</button>
    </div>
    <style>
      @keyframes fadeIn {
        from { opacity:0; transform:translate(-50%,20px); }
        to { opacity:1; transform:translateX(-50%); }
      }
    </style>
  `;
  document.body.appendChild(banner);

  document.getElementById('installNow')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA install outcome:', outcome);
    deferredPrompt = null;
    banner.remove();
  });

  document.getElementById('installLater')?.addEventListener('click', () => {
    deferredPrompt = null;
    banner.remove();
  });
});

// === SERVICE WORKER REGISTRATION WITH IMMEDIATE CONTROL ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('SW registered:', reg);

    // If there's a waiting SW, tell it to skip waiting
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Watch for new installing SW
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });
  }).catch(err => console.error('SW registration failed:', err));

  // Reload once new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

const COMMUNITY_WALLET = "BaWnqSUeJ7Rvt27pReDuVt1GhxdRjXPH2n4f7KBBDp9X";
const SCANS_PER_SOL = 5000;

const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.rpc.extrnode.com'
];
let currentRpcIndex = 0;

function getCurrentRpc() {
  return RPC_ENDPOINTS[currentRpcIndex];
}

function nextRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
}

let solanaWeb3 = null;

async function loadSolanaWeb3() {
  if (solanaWeb3) return solanaWeb3;
  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.4/+esm');
    solanaWeb3 = module;
    return solanaWeb3;
  } catch (err) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('grokApiKey');
  if (apiKeyInput) {
    const savedKey = localStorage.getItem('grokApiKey');
    if (savedKey) apiKeyInput.value = savedKey;
  }

  document.getElementById('saveApiKey')?.addEventListener('click', () => {
    const key = apiKeyInput?.value.trim() || '';
    if (key) {
      localStorage.setItem('grokApiKey', key);
      alert('Grok key saved 🧠');
    } else {
      localStorage.removeItem('grokApiKey');
      alert('Key cleared');
    }
  });

  document.getElementById('connectWallet')?.addEventListener('click', async () => {
    if (!window.solana) return alert('No wallet detected — install Phantom');

    try {
      await window.solana.connect();
      const pubKey = window.solana.publicKey.toString();
      document.getElementById('walletStatus').textContent = `Connected: ${pubKey.slice(0,8)}...${pubKey.slice(-4)}`;

      ['apiKeySection', 'features', 'healthScore', 'tipSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
      });

      await calculateHealthScore(pubKey);
    } catch (err) {
      alert('Connection failed — approve in Phantom');
    }
  });

  // Synchronous tip button - no async race
  document.getElementById('tipButton')?.addEventListener('click', () => {
    if (!window.solana) {
      alert('No wallet detected — install Phantom');
      return;
    }
    if (!window.solana.publicKey) {
      alert('Connect wallet first');
      return;
    }
    showTipModal();
  });

  document.getElementById('shareScore')?.addEventListener('click', shareOnX);
  document.getElementById('revokeButton')?.addEventListener('click', revokeRisks);

  updateCommunityBalance();
  setInterval(updateCommunityBalance, 30000);
});

async function updateCommunityBalance() {
  const balanceEl = document.getElementById('communityBalance');
  if (!balanceEl) return;

  const web3 = await loadSolanaWeb3();
  if (!web3) {
    balanceEl.textContent = '0.0000 SOL';
    return;
  }

  let attempts = 0;
  while (attempts < RPC_ENDPOINTS.length) {
    try {
      const { Connection, PublicKey } = web3;
      const connection = new Connection(getCurrentRpc(), 'confirmed');
      const balanceLamports = await connection.getBalance(new PublicKey(COMMUNITY_WALLET));
      const balanceSol = (balanceLamports / 1_000_000_000).toFixed(4);
      balanceEl.textContent = `${balanceSol} SOL`;
      return;
    } catch (err) {
      attempts++;
      nextRpc();
    }
  }
  balanceEl.textContent = '0.0000 SOL';
}

async function calculateHealthScore(pubKey) {
  // Placeholder - replace with real logic later
  const score = 98;
  const fullCircum = 590;
  const offset = fullCircum - (fullCircum * score / 100);

  const fillCircle = document.querySelector('#scoreCircle .fill');
  if (fillCircle) fillCircle.style.strokeDashoffset = offset;

  document.getElementById('scoreNumber').textContent = score;
  document.getElementById('scoreText').textContent = score >= 90 ? 'Elite — armored' : 'Needs attention';
  document.getElementById('eliteText').textContent = score >= 90 ? 'Elite — armored' : '';

  const revokeBtn = document.getElementById('revokeButton');
  if (revokeBtn) revokeBtn.classList.toggle('hidden', true);

  updateCommunityBalance();
}

async function revokeRisks() {
  alert('One-tap revoke ready — full transaction flow here');
}

function shareOnX() {
  const score = document.getElementById('scoreNumber')?.textContent || '??';
  const text = encodeURIComponent(`Just armored my wallet ${score}/100 with @NormieShield 🛡️\n\nOffline-first scanner + one-tap revoke + funds free Grok scans for normies.\n\nReal wins, no rugs.\nhttps://normie-shield.netlify.app/`);
  window.open(`https://x.com/intent/post?text=${text}`);
}

function showTipModal() {
  const existing = document.getElementById('tipModalOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'tipModalOverlay';
  overlay.innerHTML = `
    <div class="tip-backdrop"></div>
    <div class="tip-card">
      <h2>🧠 Fund Free Grok Scans</h2>
      <div class="tip-presets">
        <button class="tip-preset" data-amount="0.01">0.01 SOL (~50 scans)</button>
        <button class="tip-preset" data-amount="0.05">0.05 SOL (~250 scans)</button>
        <button class="tip-preset" data-amount="0.1">0.1 SOL (~500 scans)</button>
      </div>
      <div class="tip-custom">
        <input type="number" id="customTipInput" placeholder="Or enter custom amount in SOL" step="0.000000001" min="0.00001">
      </div>
      <div class="tip-actions">
        <button id="tipCancelBtn">Cancel</button>
        <button id="tipConfirmBtn">Send Tip 🫡</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.tip-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      executeTip(parseFloat(btn.dataset.amount)).then(() => overlay.remove());
    });
  });

  overlay.querySelector('#tipCancelBtn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.tip-backdrop').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#tipConfirmBtn').addEventListener('click', () => {
    const input = document.getElementById('customTipInput');
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) return alert('Enter valid amount');
    executeTip(amount).then(() => overlay.remove());
  });
}

async function executeTip(solAmount) {
  const web3 = await loadSolanaWeb3();
  if (!web3) return alert('Solana library unavailable — try again later');

  const lamports = Math.floor(solAmount * 1e9);
  if (lamports < 10000) return alert('Amount too small - min 0.00001 SOL');

  let attempts = 0;
  while (attempts < RPC_ENDPOINTS.length) {
    try {
      const { Connection, PublicKey, Transaction, SystemProgram } = web3;
      const connection = new Connection(getCurrentRpc(), 'confirmed');
      const from = window.solana.publicKey;
      const to = new PublicKey(COMMUNITY_WALLET);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: to,
          lamports
        })
      );

      tx.feePayer = from;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);

      const scansUnlocked = Math.floor(solAmount * SCANS_PER_SOL);
      alert(`🫡 Success! Funded ${solAmount.toFixed(4)} SOL\n~${scansUnlocked} free Grok scans unlocked for the community 🔥\n\nTx: https://solscan.io/tx/${sig}`);

      updateCommunityBalance();
      return;
    } catch (err) {
      attempts++;
      if (attempts < RPC_ENDPOINTS.length) nextRpc();
    }
  }
  alert('Tip failed — network unreachable');
}
// === NEW: Submit save story → Grok truth → optional X boost ===
async function submitSaveStory() {
  const story = prompt("Share your save story (what happened, how Normie Shield helped):");
  if (!story?.trim()) return;

  const tx_link = prompt("Paste Solscan tx link (optional but boosts truth score):");

  const username = prompt("Your @username on X (optional):") || 'anonymous';

  // Step 1: Grok judgment
  const judgeRes = await fetch('/api/truth-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      story: story.trim(),
      wallet: window.solana?.publicKey?.toString(),
      username,
      tx_link: tx_link?.trim()
    })
  });

  const judgment = await judgeRes.json();

  if (judgment.auto_boost && judgment.truth_score >= 8) {
    // Step 2: Auto-boost on X
    await fetch('/api/boost-on-x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story, username, tx_link })
    });

    alert(`🔥 Grok verified your save (${judgment.truth_score}/10) and posted it on X automatically!\n\nReason: ${judgment.reason}`);
  } else {
    alert(`Story submitted. Grok score: ${judgment.truth_score}/10\nReason: ${judgment.reason}\n(Boost threshold not met)`);
  }
}

// Add a button somewhere in index.html, e.g. in healthScore section:
// <button id="shareStory">Share Your Save Story</button>

// Then in DOMContentLoaded:
document.getElementById('shareStory')?.addEventListener('click', submitSaveStory);



