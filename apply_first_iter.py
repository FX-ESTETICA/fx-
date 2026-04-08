import re
import os

with open("src/features/profile/components/UserDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update framer-motion import
content = content.replace(
    'import { motion } from "framer-motion";',
    'import { motion, AnimatePresence } from "framer-motion";'
)

# 2. Add states
state_block = """  const [submitError, setSubmitError] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = ascensionMode === "indie" 
    ? ["identity", "location", "visuals", "federation"] 
    : ["identity", "visuals", "federation"];

  // 挂载时查询是否有历史申请"""

content = content.replace(
    '  const [submitError, setSubmitError] = useState("");\n\n  // 挂载时查询是否有历史申请',
    state_block
)

# 3. Add handleNextStep and renderStepContent
functions_block = """  // ------------------------------------------------------------------
  // 步骤推进与场景分发器 (Step Progression & Scene Dispatcher)
  // ------------------------------------------------------------------

  const handleNextStep = () => {
    const step = steps[currentStepIndex];
    const errors = [];
    
    if (step === "identity") {
      if (!formData.brandName.trim()) errors.push("brandName");
      if (!formData.contact.trim()) errors.push("contact");
    } else if (step === "location") {
      if (!formData.mapsLink.trim()) errors.push("mapsLink");
    }
    
    if (errors.length > 0) {
      setFormErrors(errors);
      const pod = document.getElementById("application-pod");
      if (pod) {
        pod.classList.add("animate-shake");
        setTimeout(() => pod.classList.remove("animate-shake"), 500);
      }
      return;
    }
    
    setFormErrors([]);
    setCurrentStepIndex(i => i + 1);
  };

  const renderStepContent = (step: string) => {
    switch(step) {
      case "identity":
        return (
          <>
            <div className="mb-8">
              <h3 className="text-2xl font-black tracking-tighter text-white">01 / 基础身份</h3>
              <p className="text-[10px] font-mono text-gx-gold uppercase tracking-widest mt-1">Identity Authorization</p>
            </div>
            
            <div className="space-y-6">
              {/* Identity Fission Switch */}
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => { setAscensionMode("indie"); setCurrentStepIndex(0); }}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all rounded-lg",
                    ascensionMode === "indie" ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white/80"
                  )}
                >
                  {t('txt_e67844')}
                </button>
                <button 
                  onClick={() => { setAscensionMode("enterprise"); setCurrentStepIndex(0); }}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all rounded-lg",
                    ascensionMode === "enterprise" ? "bg-gx-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.5)]" : "text-white/40 hover:text-white/80"
                  )}
                >
                  {t('txt_4ba0be')}
                </button>
              </div>

              {/* Brand Name */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-mono">
                  {ascensionMode === "indie" ? "空间名称 / BRAND NAME" : "集团名称 / CONGLOMERATE"}
                </label>
                <Input 
                  autoFocus
                  placeholder={ascensionMode === "indie" ? "输入您的店名..." : "输入企业/集团名称..."}
                  value={formData.brandName}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                  className={cn(
                    "bg-black/50 focus:border-gx-gold/50 transition-all h-14 text-base font-bold",
                    formErrors.includes("brandName") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                  )} 
                />
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-mono">{t('txt_7b7c43')}</label>
                <div className="flex gap-2">
                  <div className="relative w-28 shrink-0">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 text-white font-mono text-sm outline-none focus:border-gx-gold/50 appearance-none transition-all h-14"
                    >
                      <option value="+39">IT (+39)</option>
                      <option value="+33">FR (+33)</option>
                      <option value="+49">DE (+49)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+34">ES (+34)</option>
                      <option value="+86">CN (+86)</option>
                      <option value="+1">US (+1)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-[10px]">▼</div>
                  </div>
                  <Input 
                    placeholder="138..." 
                    value={formData.contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    className={cn(
                      "flex-1 bg-black/50 focus:border-gx-gold/50 transition-all font-mono h-14 text-base",
                      formErrors.includes("contact") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                    )} 
                  />
                </div>
              </div>

              {/* Industry */}
              {ascensionMode === "indie" && (
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-mono">{t('txt_133313')}</label>
                  <div className="relative">
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 text-white font-mono text-sm outline-none focus:border-gx-gold/50 appearance-none transition-all h-14"
                    >
                      <option value="beauty">{t('txt_81f35c')}</option>
                      <option value="dining">{t('txt_2c5374')}</option>
                      <option value="medical">{t('txt_771f4a')}</option>
                      <option value="fitness">{t('txt_2a34d1')}</option>
                      <option value="expert">{t('txt_e0e1b5')}</option>
                      <option value="hotel">{t('txt_5c4f50')}</option>
                      <option value="other">{t('txt_fe629b')}</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case "location":
        return (
          <>
            <div className="mb-8">
              <h3 className="text-2xl font-black tracking-tighter text-white">{t('txt_99ebed')}</h3>
              <p className="text-[10px] font-mono text-gx-gold uppercase tracking-widest mt-1">Spatial Anchor</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-mono flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> {t('txt_c6dc08')}
                </label>
                <Input 
                  autoFocus
                  placeholder="https://maps.google.com/..." 
                  value={formData.mapsLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, mapsLink: e.target.value }))}
                  className={cn(
                    "bg-black/50 focus:border-gx-gold/50 font-mono text-sm transition-all h-14",
                    formErrors.includes("mapsLink") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                  )} 
                />
                <p className="text-[10px] text-white/30 mt-4 leading-relaxed bg-white/5 p-3 rounded-lg">{t('txt_bd30a5')}</p>
              </div>
            </div>
          </>
        );
      case "visuals":
        return (
          <>
            <div className="mb-8">
              <h3 className="text-2xl font-black tracking-tighter text-white">
                {ascensionMode === "indie" ? "03 / 核心视觉" : "02 / 集团标志"}
              </h3>
              <p className="text-[10px] font-mono text-gx-gold uppercase tracking-widest mt-1">Core Assets</p>
            </div>
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-6 bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer group">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-gx-gold transition-colors shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-bold text-white/90">{t('txt_288d4b')}</p>
                <p className="text-xs text-white/40">{t('txt_89e530')}</p>
              </div>
            </div>
          </>
        );
      case "federation":
        return (
          <>
            <div className="mb-8">
              <h3 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                <Zap className="w-6 h-6 text-gx-gold" /> {t('txt_1c0987')}
              </h3>
              <p className="text-[10px] font-mono text-gx-gold uppercase tracking-widest mt-1">Federation Protocol</p>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] text-white/40 uppercase font-mono">{t('txt_047e19')}</label>
              {ascensionMode === "enterprise" ? (
                <div className="bg-black/50 p-4 rounded-xl border border-gx-gold/30 font-mono text-gx-gold flex items-center justify-between shadow-[inset_0_0_20px_rgba(255,184,0,0.1)]">
                  <span className="tracking-widest text-lg">{profileGxId || "SYS-ERROR"}</span>
                  <span className="text-[10px] text-gx-gold/40 border border-gx-gold/20 px-2 py-1 rounded">{t('txt_715ff0')}</span>
                </div>
              ) : (
                <Input 
                  autoFocus
                  placeholder={t('txt_9f091a')} 
                  value={formData.nexusCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, nexusCode: e.target.value }))}
                  className="bg-gx-gold/5 border-gx-gold/20 focus:border-gx-gold text-gx-gold placeholder:text-gx-gold/20 font-mono tracking-widest text-base h-14 text-center"
                />
              )}
              <div className="bg-white/5 rounded-xl p-4 mt-6 border border-white/5">
                <p className="text-xs text-white/50 leading-relaxed">
                  {ascensionMode === "enterprise" 
                    ? "您正在创建企业联邦。系统已自动将您的专属标识设为最高统摄集结码。" 
                    : <>{t('txt_816c34')}<br/><br/><span className="text-gx-gold/60">{t('txt_a86a3c')}</span></>
                  }
                </p>
              </div>
            </div>
            {submitError && (
              <p className="text-gx-red text-xs text-center mt-6 font-mono bg-red-500/10 p-2 rounded">{submitError}</p>
            )}
          </>
        );
      default:
        return null;
    }
  };

"""

# Insert functions before the old Scene Dispatcher
content = content.replace(
    '  // ------------------------------------------------------------------\n  // 场景分发器 (Scene Dispatcher) - 引入 UI 绝对剥夺法则',
    functions_block + '  // ------------------------------------------------------------------\n  // 场景分发器 (Scene Dispatcher) - 引入 UI 绝对剥夺法则'
)
# Support CRLF
content = content.replace(
    '  // ------------------------------------------------------------------\r\n  // 场景分发器 (Scene Dispatcher) - 引入 UI 绝对剥夺法则',
    functions_block + '  // ------------------------------------------------------------------\r\n  // 场景分发器 (Scene Dispatcher) - 引入 UI 绝对剥夺法则'
)

# 4. Replace the if (showMerchantPortal) block
old_if_block = content[content.find('  if (showMerchantPortal && applicationStatus !== "success") {'):content.find('  // ------------------------------------------------------------------\n  // 常规仪表盘场景 (Normal Dashboard)')]
if not old_if_block:
    old_if_block = content[content.find('  if (showMerchantPortal && applicationStatus !== "success") {'):content.find('  // ------------------------------------------------------------------\r\n  // 常规仪表盘场景 (Normal Dashboard)')]

new_if_block = """  if (showMerchantPortal && applicationStatus !== "success") {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
        {/* Z-Axis Parallax Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
        </div>

        {/* Top Bar / Header */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
          <div className="space-y-2">
            <Sparkles className="w-6 h-6 text-gx-gold" />
            <h2 className="text-xl md:text-3xl font-black tracking-tighter leading-tight text-white drop-shadow-lg">
              {t('txt_d3a60f')}<br/>{t('txt_697bfe')}
            </h2>
            <div className="text-[10px] font-mono text-gx-gold uppercase tracking-widest">
              ASCENSION_PROTOCOL_ACTIVE // STEP {currentStepIndex + 1}/{steps.length}
            </div>
          </div>
          <button 
            onClick={() => setShowMerchantPortal(false)} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Holographic Capsule */}
        <div className="w-full max-w-md px-6 relative z-10 flex flex-col justify-center h-full max-h-[80vh] mt-20" id="application-pod">
          <AnimatePresence mode="wait">
            <motion.div
              key={steps[currentStepIndex]}
              initial={{ opacity: 0, y: 40, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, scale: 0.95, filter: "blur(10px)" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full bg-black/60 backdrop-blur-2xl border border-gx-gold/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(255,184,0,0.1)] relative"
            >
              {/* Content based on current step */}
              {renderStepContent(steps[currentStepIndex])}
              
              {/* Navigation */}
              <div className="mt-8 flex gap-3">
                {currentStepIndex > 0 && (
                  <Button variant="ghost" className="flex-1 border-white/10" onClick={() => setCurrentStepIndex(i => i - 1)}>
                    返回
                  </Button>
                )}
                {currentStepIndex < steps.length - 1 ? (
                  <Button 
                    className="flex-[2] bg-gx-gold text-black hover:bg-gx-gold/90 font-bold uppercase tracking-widest text-sm h-12"
                    onClick={handleNextStep}
                  >
                    下一步 (ENTER)
                  </Button>
                ) : (
                  <Button 
                    className="flex-[2] bg-gx-cyan text-black hover:bg-gx-cyan/90 shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold uppercase tracking-widest text-sm h-12"
                    onClick={handleAscensionSubmit}
                    disabled={applicationStatus === "submitting"}
                  >
                    {applicationStatus === "submitting" ? "解析中..." : "启动跃迁 (SUBMIT)"}
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Progress Indicator */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-20">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                idx === currentStepIndex ? "w-8 bg-gx-gold shadow-[0_0_10px_rgba(255,184,0,0.8)]" : "w-2 bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    );
  }
"""

content = content.replace(old_if_block, new_if_block)

with open("src/features/profile/components/UserDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Restore to first iteration complete.")
