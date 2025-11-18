import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setConnected, setError, setLoading } from '@/store/authSlice';
import { connectWallet, signWalletMessage } from '@/utils/web3';
import { apiClient } from '@/utils/api';

const ConnectWalletButton: React.FC = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      // Connect wallet
      const wallet = await connectWallet();

      if (!wallet || !wallet.address) {
        throw new Error('Failed to connect wallet');
      }

      // Store wallet info in localStorage
      localStorage.setItem('walletAddress', wallet.address);
      if (wallet.publicKey) {
        localStorage.setItem('walletPublicKey', wallet.publicKey);
      }

      const authMessage = `Login to Trust Arena as ${wallet.address} on ${new Date().toISOString()}`;
      const signature = await signWalletMessage(authMessage, wallet.address);

      // Register/login on backend with signed message
      const response = await apiClient.post('/auth/login', {
        walletAddress: wallet.address,
        message: authMessage,
        signature,
        publicKey: wallet.publicKey,
      });

      const { token, player } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      // Dispatch to Redux
      dispatch(
        setConnected({
          player,
          token,
        })
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to connect wallet';
      dispatch(setError(errorMessage));
      console.error('Wallet connection failed:', error);
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Connecting...' : 'Connect OneChain Wallet'}
    </button>
  );
};

export default ConnectWalletButton;
