import Hero from '../components/Hero.jsx';
import TemplateGallery from '../components/TemplateGallery.jsx';
import { EditorDemoSection } from '../components/EditorDemo.jsx';
import PremiumSection from '../components/PremiumSection.jsx';
import CommissionBanner from '../components/CommissionBanner.jsx';
import Footer from '../components/Footer.jsx';

export default function GalleryPage() {
  return (
    <div>
      <Hero />
      <TemplateGallery />
      {/* الفيديو بيجي بعد ما يشوف التصاميم بالظبط: هو ساعتها عجبه
          تصميم وبيسأل نفسه "طب أقدر أغيّر فيه؟" — الفيديو هو الإجابة،
          وبعده على طول قسم الباقات */}
      <EditorDemoSection />
      <PremiumSection />
      <CommissionBanner />
      <Footer />
    </div>
  );
}
