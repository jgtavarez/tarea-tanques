import { NextPage } from 'next';
import dynamic from 'next/dynamic';

// Dynamically import TankGame to avoid SSR issues with canvas
const TankGame = dynamic(() => import('../components/TankGame'), {
  ssr: false,
});

const HomePage: NextPage = () => {
  return <TankGame />;
};

export default HomePage; 