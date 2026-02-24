import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Sparkles, 
  Video, 
  CheckCircle2, 
  ChevronRight, 
  Zap, 
  Image as ImageIcon,
  Loader2,
  Lock,
  Crown,
  Play,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  GENERATION_STYLES, 
  GenerationStyle, 
  generateProductRecommendations, 
  generateVideo,
  generateTTS
} from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const CHECKOUT_URL = "http://lynk.id/radhit000/4904760m4q7v/checkout";

export default function App() {
  const [assets, setAssets] = useState<{
    product: string | null;
    model: string | null;
    costume: string | null;
    ornament: string | null;
  }>({
    product: null,
    model: null,
    costume: null,
    ornament: null
  });

  const [script, setScript] = useState("");
  const [productPrompt, setProductPrompt] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<GenerationStyle>(GENERATION_STYLES[0]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [selectedRecImage, setSelectedRecImage] = useState<string | null>(null);
  const [showProModal, setShowProModal] = useState(false);

  const handleUpgrade = () => {
    window.open(CHECKOUT_URL, '_blank');
    setShowProModal(true);
  };

  const handleVerifyPro = async () => {
    setIsVerifying(true);
    // Simulate a payment verification check
    // In a real app, this would call an API to check the transaction status
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (verificationCode.toUpperCase() === "PRO2026") {
      setIsPro(true);
      setShowProModal(false);
      setVerificationCode("");
    } else {
      alert("Verification failed. Please ensure you have completed the payment and entered the correct transaction ID or code.");
    }
    setIsVerifying(false);
  };

  const handleFileUpload = (type: keyof typeof assets, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAssets(prev => ({ ...prev, [type]: reader.result as string }));
      setRecommendations([]);
      setSelectedRecImage(null);
      setGeneratedVideoUrl(null);
      setGeneratedAudioUrl(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateRecommendations = async () => {
    if (!assets.product) return;
    setIsGeneratingImages(true);
    try {
      const images = await generateProductRecommendations(
        { 
          product: assets.product || undefined, 
          model: assets.model || undefined, 
          costume: assets.costume || undefined, 
          ornament: assets.ornament || undefined 
        }, 
        selectedStyle,
        productPrompt
      );
      setRecommendations(images);
      if (images.length > 0) setSelectedRecImage(images[0]);
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      alert(error.message || "Gagal menghasilkan konsep. Silakan periksa koneksi atau API Key Anda.");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }

    if (!script) {
      alert("Please enter a script for the voiceover first.");
      return;
    }

    const hasKey = window.aistudio ? await window.aistudio.hasSelectedApiKey() : true;
    if (!hasKey && window.aistudio) {
      await window.aistudio.openSelectKey();
    }

    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setGeneratedAudioUrl(null);

    try {
      const targetImage = selectedRecImage || assets.product;
      if (!targetImage) return;

      // Parallel generation of Video and TTS
      const videoPromise = generateVideo(
        targetImage, 
        `A high-energy affiliate marketing video. The model is promoting the product. Style: ${selectedStyle.name}. ${selectedStyle.promptSuffix}. ${script ? `The model is speaking: "${script}"` : ""}. Dynamic camera movement, zooming in on details, professional transitions.`
      );

      const ttsPromise = script ? generateTTS(script) : Promise.resolve(null);

      const [videoUrl, audioUrl] = await Promise.all([videoPromise, ttsPromise]);
      
      setGeneratedVideoUrl(videoUrl);
      setGeneratedAudioUrl(audioUrl);
    } catch (error: any) {
      console.error("Error generating video:", error);
      if (error.message?.includes("Requested entity was not found") && window.aistudio) {
        await window.aistudio.openSelectKey();
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const UploadBox = ({ type, label, icon: Icon }: { type: keyof typeof assets, label: string, icon: any }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (files) => handleFileUpload(type, files[0]),
      accept: { 'image/*': [] },
      multiple: false
    });

    return (
      <div 
        {...getRootProps()} 
        className={cn(
          "relative aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group",
          isDragActive ? "border-brand-primary bg-brand-primary/5" : "border-white/10 bg-brand-card hover:border-brand-primary/50",
          assets[type] ? "border-solid" : ""
        )}
      >
        <input {...getInputProps()} />
        {assets[type] ? (
          <div className="relative w-full h-full">
            <img src={assets[type]!} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs font-bold flex items-center gap-1">
                <Upload className="w-3 h-3" /> Change
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <Icon className="w-6 h-6 text-white/20 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-xs mb-1">{label}</p>
            <p className="text-[10px] text-white/20">Drop image</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-paper text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-card border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,255,0,0.5)]">
            <Zap className="w-6 h-6 fill-black text-black" />
          </div>
          <span className="text-xl font-display font-bold uppercase tracking-tighter text-white title-glow">AffiliateVideo AI</span>
        </div>
        <div className="flex items-center gap-4">
          {!isPro ? (
            <button 
              onClick={() => setShowProModal(true)}
              className="bg-white text-black text-sm py-2 px-6 font-bold rounded-full hover:scale-105 transition-all shadow-lg"
            >
              Register to Pro
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/20 rounded-full border border-brand-primary/30">
              <Crown className="w-4 h-4 text-brand-primary fill-brand-primary" />
              <span className="text-xs font-bold uppercase text-brand-primary">Pro Member</span>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Multi-Upload & Config */}
        <div className="lg:col-span-5 space-y-10">
          <section>
            <h2 className="section-title">1. Upload Assets</h2>
            <p className="text-white/40 mb-6">Upload all elements for your ad concept.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <UploadBox type="product" label="Product" icon={ImageIcon} />
              <UploadBox type="model" label="Model" icon={Upload} />
              <UploadBox type="costume" label="Costume" icon={Upload} />
              <UploadBox type="ornament" label="Ornament" icon={Sparkles} />
            </div>
          </section>

          <section>
            <h2 className="section-title">2. Product Concept</h2>
            <p className="text-white/40 mb-6 text-sm">Describe your product and the desired concept for better results.</p>
            <textarea
              value={productPrompt}
              onChange={(e) => setProductPrompt(e.target.value)}
              placeholder="e.g. This is a premium organic skincare bottle. I want it to look refreshing, surrounded by water splashes and natural leaves to emphasize its organic nature."
              className="w-full h-32 bg-brand-card border border-white/5 rounded-2xl p-4 text-sm focus:border-brand-primary/50 outline-none transition-all resize-none shadow-inner"
            />
          </section>

          <section>
            <h2 className="section-title">3. Script & Voice</h2>
            <p className="text-white/40 mb-6 text-sm">Write what the model should say in the video.</p>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="e.g. This new product is a game changer! Check the link in bio to get yours today with 20% off."
              className="w-full h-32 bg-brand-card border border-white/5 rounded-2xl p-4 text-sm focus:border-brand-primary/50 outline-none transition-all resize-none shadow-inner"
            />
          </section>

          <section>
            <h2 className="section-title">4. Choose Style</h2>
            <p className="text-white/40 mb-6 text-sm">Select the visual aesthetic for your promotion.</p>
            <div className="grid grid-cols-1 gap-3">
              {GENERATION_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                    selectedStyle.id === style.id 
                      ? "bg-brand-primary/10 border-brand-primary/50 shadow-[0_0_20px_rgba(0,255,0,0.05)]" 
                      : "bg-brand-card border-white/5 hover:border-white/10"
                  )}
                >
                  <div>
                    <p className={cn("font-bold", selectedStyle.id === style.id ? "text-brand-primary" : "text-white")}>{style.name}</p>
                    <p className={cn("text-xs", selectedStyle.id === style.id ? "text-brand-primary/60" : "text-white/40")}>
                      {style.description}
                    </p>
                  </div>
                  <ChevronRight className={cn("w-5 h-5 transition-transform", selectedStyle.id === style.id ? "translate-x-1 text-brand-primary" : "opacity-0 group-hover:opacity-100")} />
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={handleGenerateRecommendations}
            disabled={!assets.product || isGeneratingImages}
            className="w-full glow-button py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            {isGeneratingImages ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Generate Ad Concept
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-12">
          <section className="min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">5. Concept Options</h2>
              {recommendations.length > 0 && (
                <span className="text-xs font-bold uppercase bg-brand-primary/10 px-3 py-1 rounded-full text-brand-primary">
                  Select an Option
                </span>
              )}
            </div>

            {!assets.product ? (
              <div className="h-[400px] rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/10">
                <ImageIcon className="w-12 h-12 mb-4" />
                <p className="font-medium">Upload assets to see concepts</p>
              </div>
            ) : isGeneratingImages ? (
              <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-brand-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl">Composing your ad...</p>
                  <p className="text-white/40">Merging model, costume, and product into {selectedStyle.name} style</p>
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendations.map((img, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx}
                    onClick={() => setSelectedRecImage(img)}
                    className={cn(
                      "relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all",
                      selectedRecImage === img ? "border-brand-primary shadow-[0_0_30px_rgba(0,255,0,0.1)]" : "border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="aspect-[4/5] relative">
                      <img src={img} alt={`Concept ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-4 left-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Option</p>
                        <p className="text-2xl font-display font-bold">0{idx + 1}</p>
                      </div>
                    </div>
                    {selectedRecImage === img && (
                      <div className="absolute top-4 right-4 bg-brand-primary p-2 rounded-full shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-black" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-[400px] rounded-2xl bg-brand-card border border-white/5 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Ready to Create Your Campaign?</h3>
                <p className="text-white/40 max-w-sm">
                  Upload your model, costume, and product. We'll combine them into a professional ad frame.
                </p>
              </div>
            )}
          </section>

          <section className="pt-12 border-t border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="section-title">6. Final Production</h2>
                <p className="text-white/40 text-sm">Generate video with AI voiceover.</p>
              </div>
              <button
                onClick={handleCreateVideo}
                disabled={isGeneratingVideo || (!assets.product && !selectedRecImage)}
                className={cn(
                  "glow-button py-3 px-8 rounded-xl flex items-center gap-2",
                  !isPro && "bg-white/5 text-white/20 shadow-none grayscale"
                )}
              >
                {isGeneratingVideo ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPro ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {isGeneratingVideo ? "Generating..." : "Create to Video"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="relative aspect-[9/16] w-full rounded-3xl overflow-hidden bg-black shadow-2xl border-8 border-brand-card">
                {generatedVideoUrl ? (
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-full object-cover"
                  />
                ) : isGeneratingVideo ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
                    <div className="relative mb-8">
                      <div className="w-24 h-24 border-4 border-white/10 border-t-brand-primary rounded-full animate-spin" />
                      <Video className="absolute inset-0 m-auto w-8 h-8 text-brand-primary" />
                    </div>
                    <h3 className="text-2xl font-display font-bold mb-4">Producing Video</h3>
                    <div className="space-y-3 text-white/60 text-sm">
                      <p className="animate-pulse">Processing multi-asset frame...</p>
                      <p className="animate-pulse delay-75">Generating cinematic motion...</p>
                      <p className="animate-pulse delay-150">This takes about 60-90 seconds.</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white/10">
                    <Play className="w-16 h-16 mb-4 opacity-10" />
                    <p className="font-display font-bold text-xl uppercase tracking-widest">Video Preview</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6 border border-white/5">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary" /> AI Voiceover
                  </h3>
                  {generatedAudioUrl ? (
                    <div className="space-y-4">
                      <audio src={generatedAudioUrl} controls className="w-full" />
                      <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-xs text-white/40 uppercase font-bold mb-2">Script Used</p>
                        <p className="text-sm italic">"{script}"</p>
                      </div>
                    </div>
                  ) : isGeneratingVideo ? (
                    <div className="flex items-center gap-3 text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-sm">Generating speech...</p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/20 italic">Voiceover will be generated with the video.</p>
                  )}
                </div>

                {!isPro && (
                  <div className="p-6 bg-brand-primary/10 rounded-2xl border border-brand-primary/20">
                    <Crown className="w-8 h-8 text-brand-primary mb-4" />
                    <h3 className="text-xl font-bold mb-2">Unlock Pro Features</h3>
                    <p className="text-sm text-white/60 mb-4">Get access to AI Video, Voiceover, and high-resolution exports.</p>
                    <button 
                      onClick={handleUpgrade}
                      className="w-full py-3 bg-brand-primary text-black font-bold rounded-xl hover:scale-[1.02] transition-transform"
                    >
                      Upgrade Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Pro Modal */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-brand-card rounded-3xl p-8 shadow-2xl border-2 border-brand-primary"
            >
              <div className="w-16 h-16 bg-brand-primary neo-brutal-border flex items-center justify-center mb-6 -mt-16 mx-auto">
                <Crown className="w-8 h-8 fill-black text-black" />
              </div>
              <h3 className="text-3xl font-display font-bold text-center mb-2 text-white">Upgrade to Pro</h3>
              <p className="text-center text-white/60 mb-8">Unlock AI Video generation and create high-converting ads in seconds.</p>
              
              {!isPro && (
                <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold uppercase text-brand-primary mb-3">Already Paid?</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter Verification Code"
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-primary"
                    />
                    <button 
                      onClick={handleVerifyPro}
                      disabled={isVerifying || !verificationCode}
                      className="bg-brand-primary text-black px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 mt-2 italic">
                    * Use code "PRO2026" for demo purposes or check your email after payment.
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-8">
                {[
                  "Unlimited AI Video Generations",
                  "High-Resolution 1080p Exports",
                  "Multi-Asset Frame Composition",
                  "Priority Processing",
                  "Commercial Usage License"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-brand-primary" />
                    </div>
                    <span className="font-medium text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleUpgrade}
                className="w-full glow-button py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                Get Pro Access Now <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowProModal(false)}
                className="w-full mt-4 text-sm font-bold text-white/20 hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-24 border-t border-white/5 py-12 px-6 bg-brand-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary neo-brutal-border flex items-center justify-center">
              <Zap className="w-4 h-4 fill-black text-black" />
            </div>
            <span className="font-display font-bold uppercase tracking-tighter text-white">AffiliateVideo AI</span>
          </div>
          <p className="text-white/20 text-sm">© 2026 AffiliateVideo AI. Powered by Gemini & Veo.</p>
          <div className="flex gap-6 text-sm font-bold text-white/40">
            <a href="#" className="hover:text-brand-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-brand-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-brand-primary transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
