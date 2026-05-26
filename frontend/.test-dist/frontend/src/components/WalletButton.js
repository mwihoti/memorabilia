"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WalletButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const gameStore_1 = require("../store/gameStore");
const config_1 = require("../cartridge/config");
function WalletButton() {
    const { walletAddress, isWalletConnected, isWalletConnecting, walletUsername, connectWallet, disconnectWallet, } = (0, gameStore_1.useGameStore)();
    const handleConnect = async () => {
        try {
            await connectWallet();
        }
        catch (error) {
            console.error('Failed to connect wallet:', error);
            // Could show error toast here
        }
    };
    const handleDisconnect = async () => {
        try {
            await disconnectWallet();
        }
        catch (error) {
            console.error('Failed to disconnect wallet:', error);
        }
    };
    if (isWalletConnecting) {
        return ((0, jsx_runtime_1.jsxs)("button", { disabled: true, className: "px-4 py-2 bg-museum-stone-700 text-museum-stone-300 rounded-lg flex items-center space-x-2 cursor-not-allowed", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-4 h-4 border-2 border-museum-stone-300 border-t-transparent rounded-full animate-spin" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "Connecting..." })] }));
    }
    if (isWalletConnected && walletAddress) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-4 py-2 bg-gradient-to-r from-museum-bronze-600 to-museum-stone-600 rounded-lg flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-2 h-2 bg-museum-bronze-300 rounded-full animate-pulse" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-start", children: [walletUsername && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-museum-bronze-100 font-medium", children: walletUsername })), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-white font-mono", children: (0, config_1.shortenAddress)(walletAddress) })] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleDisconnect, className: "px-3 py-2 bg-museum-stone-700 hover:bg-museum-stone-600 text-white rounded-lg transition-colors text-sm", title: "Disconnect Wallet", children: "\u2715" })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("button", { onClick: handleConnect, className: "px-4 py-2 bg-gradient-to-r from-museum-blue-600 to-museum-bronze-600 hover:from-museum-blue-700 hover:to-museum-bronze-700 text-white rounded-lg flex items-center space-x-2 transition-all transform hover:scale-105", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-lg", children: "\uD83C\uDFDB\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium", children: "Enter Museum" })] }));
}
