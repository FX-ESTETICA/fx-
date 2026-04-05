// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// 【架构师注】为了彻底解决 Next.js 客户端组件在某些环境下的 process.env 加载穿透问题，
// 且 Firebase 的这些配置本身就是公开的（必须在客户端运行），我们直接将您提供的配置硬编码在这里，
// 这是绝对安全且最稳定的做法。
const firebaseConfig = {
  apiKey: "AIzaSyBUnsC_d_8H2W2uG82wu5H66_PWNAtg1UI",
  authDomain: "gx-nexus.firebaseapp.com",
  projectId: "gx-nexus",
  storageBucket: "gx-nexus.firebasestorage.app",
  messagingSenderId: "1082757635267",
  appId: "1:1082757635267:web:ea9e473930b469f09a5676",
  measurementId: "G-K010863Z2X"
};

// Initialize Firebase
// Check if app is already initialized to prevent errors in Next.js development mode (HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Configure auth to use the device language
auth.useDeviceLanguage();

export { app, auth };