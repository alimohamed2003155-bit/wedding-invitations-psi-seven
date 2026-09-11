import Hero from '../components/Hero.jsx';
import TemplateGallery from '../components/TemplateGallery.jsx';
import PremiumSection from '../components/PremiumSection.jsx';
import CommissionBanner from '../components/CommissionBanner.jsx';
import Footer from '../components/Footer.jsx';

export default function GalleryPage() {
  return (
    <div>
      <Hero />
      <TemplateGallery />
      <PremiumSection />
      <CommissionBanner />
      <Footer />
    </div>
  );
}
