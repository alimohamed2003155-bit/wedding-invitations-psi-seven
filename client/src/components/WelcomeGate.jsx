// بيقرر إمتى شاشة الترحيب تبان.
//
// مفصول عن الشاشة نفسها عشان الشاشة تفضل مكوّن عرض بس، والقرار
// (مين يشوفها وإمتى) في مكان واحد واضح.
//
// بتظهر على كل الصفحات — حتى المحرر ولوحة التحكم — لأن التسجيل ممكن
// يحصل من أي مكان (مثلاً وهو بيحاول يطلب باقة).
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence } from 'motion/react';
import WelcomeModal from './WelcomeModal.jsx';
import { hideWelcome } from '../store/uiSlice.js';

export default function WelcomeGate() {
  const dispatch = useDispatch();
  const welcomeFor = useSelector((s) => s.ui.welcomeFor);

  return (
    <AnimatePresence>
      {welcomeFor !== null && (
        <WelcomeModal name={welcomeFor} onClose={() => dispatch(hideWelcome())} />
      )}
    </AnimatePresence>
  );
}
