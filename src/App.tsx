import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  PenTool, 
  Lightbulb, 
  Sparkles, 
  CheckCircle2, 
  GraduationCap,
  MessageSquare,
  Loader2,
  Home,
  Star,
  Heart,
  Cloud,
  Sun,
  Smile,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ESSAY_UNITS, EssayUnit } from './constants';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [selectedUnit, setSelectedUnit] = useState<EssayUnit | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [generatedEssays, setGeneratedEssays] = useState<{title: string, content: string}[]>([]);
  const [viewingEssayIdx, setViewingEssayIdx] = useState<number | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTechniquePhase, setIsTechniquePhase] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");

  const mainRef = useRef<HTMLDivElement>(null);

  const handleNextQuestion = () => {
    if (!currentAnswer.trim()) return;
    
    const questionKey = `${currentStep}-${currentQuestionIdx}`;
    const newAnswers = { ...answers, [questionKey]: currentAnswer };
    setAnswers(newAnswers);

    const unit = selectedUnit!;
    let nextStep = currentStep;
    let nextQIdx = currentQuestionIdx;

    if (currentQuestionIdx < unit.steps[currentStep].questions.length - 1) {
      nextQIdx = currentQuestionIdx + 1;
    } else if (currentStep < unit.steps.length - 1) {
      nextStep = currentStep + 1;
      nextQIdx = 0;
    } else {
      // All questions answered, go to technique phase
      setIsTechniquePhase(true);
      return;
    }

    setCurrentStep(nextStep);
    setCurrentQuestionIdx(nextQIdx);
    const nextKey = `${nextStep}-${nextQIdx}`;
    setCurrentAnswer(newAnswers[nextKey] || "");
  };

  const handlePrevQuestion = () => {
    if (isTechniquePhase) {
      setIsTechniquePhase(false);
      return;
    }

    const unit = selectedUnit!;
    let prevStep = currentStep;
    let prevQIdx = currentQuestionIdx;

    if (currentQuestionIdx > 0) {
      prevQIdx = currentQuestionIdx - 1;
    } else if (currentStep > 0) {
      prevStep = currentStep - 1;
      prevQIdx = unit.steps[prevStep].questions.length - 1;
    } else {
      return;
    }

    // Save current answer if it's not empty (optional but helpful)
    const currentKey = `${currentStep}-${currentQuestionIdx}`;
    const newAnswers = { ...answers };
    if (currentAnswer.trim()) {
      newAnswers[currentKey] = currentAnswer;
      setAnswers(newAnswers);
    }

    setCurrentStep(prevStep);
    setCurrentQuestionIdx(prevQIdx);
    const prevKey = `${prevStep}-${prevQIdx}`;
    setCurrentAnswer(newAnswers[prevKey] || "");
  };

  const handleGenerateEssays = async () => {
    if (!practiceAnswer.trim()) return;
    setIsAiLoading(true);
    setGeneratedEssays([]);
    
    try {
      const model = "gemini-3-flash-preview";
      const answersText = Object.entries(answers)
        .map(([key, val]) => {
          const [stepIdx, qIdx] = key.split('-').map(Number);
          const question = selectedUnit?.steps[stepIdx].questions[qIdx];
          return `问：${question}\n答：${val}`;
        })
        .join('\n');

      const techniqueInfo = selectedUnit?.writingTechnique;
      const techniqueText = techniqueInfo ? `
      写作技巧：${techniqueInfo.title}
      技巧说明：${techniqueInfo.description}
      学生的练笔：${practiceAnswer}
      ` : "";

      const prompt = `你是一位亲切的语文老师。现在正在教三年级的小学生写作文。
      当前的作文题目是：${selectedUnit?.topic}
      学生已经回答了一些引导性问题，这些回答包含了他们的观察和思路：
      ${answersText}

      ${techniqueText}

      请根据学生的这些回答思路，并【务必】将学生的【练笔内容】巧妙地融入到作文中，生成4篇适合孩子去修改和借鉴的作文草稿。
      要求：
      1. 必须包含学生回答中的核心信息和思路。
      2. 必须包含学生的练笔内容（可以进行微调使其更通顺，但要保留核心意思）。
      3. 语言要符合三年级小学生的水平，生动活泼，多用修辞。
      4. 每篇作文要有题目。
      5. 每篇作文长度【必须严格】在300-400字之间。
      6. 作文必须合理分段，每个自然段开头空两格（使用两个全宽空格），确保格式规范、条理清晰。
      7. 风格要多样化（比如：叙事性、抒情性、童话风、观察日记风等）。
      8. 格式为JSON数组：[{"title": "...", "content": "..."}, ...]`;

      const result = await genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      
      const essays = JSON.parse(result.text || "[]");
      setGeneratedEssays(essays);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error("Generate Essays Error:", error);
      setGeneratedEssays([{
        title: "哎呀，老师出错了",
        content: "连接老师的信号断了，请检查网络后再试。或者你可以根据刚才的回答自己试着连成一段话哦！"
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetState = () => {
    setSelectedUnit(null);
    setCurrentStep(0);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setCurrentAnswer("");
    setGeneratedEssays([]);
    setViewingEssayIdx(null);
    setIsTechniquePhase(false);
    setPracticeAnswer("");
  };

  const handleDownloadEssay = (essay: {title: string, content: string}) => {
    const element = document.createElement("a");
    const file = new Blob([`《${essay.title}》\n\n${essay.content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${essay.title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const progress = selectedUnit 
    ? ((currentStep * 10 + currentQuestionIdx + 1) / (selectedUnit.steps.reduce((acc, s) => acc + s.questions.length, 0))) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-[#5D4037] font-sans selection:bg-yellow-200 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-20 left-10 text-yellow-400"><Sun size={80} /></motion.div>
        <motion.div animate={{ x: [0, 30, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-40 right-20 text-blue-300"><Cloud size={100} /></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} className="absolute bottom-20 left-20 text-pink-300"><Heart size={60} /></motion.div>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute bottom-40 right-10 text-orange-300"><Star size={70} /></motion.div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-4 border-yellow-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={resetState}>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg transform -rotate-3">
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-orange-900 serif">作文小状元</h1>
            <p className="text-xs text-orange-600 font-bold">部编版三年级下册同步</p>
          </div>
        </div>
        {selectedUnit && (
          <button 
            onClick={resetState}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-all font-bold text-sm border-2 border-orange-200"
          >
            <Home size={18} />
            <span>回大厅</span>
          </button>
        )}
      </header>

      <main ref={mainRef} className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!selectedUnit ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-12"
            >
              <div className="text-center space-y-6">
                <motion.div 
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  className="inline-block px-6 py-2 bg-white rounded-full border-2 border-yellow-300 text-orange-600 font-bold text-sm shadow-sm"
                >
                  ✨ 欢迎来到写作乐园 ✨
                </motion.div>
                <h2 className="text-5xl font-black text-orange-900 serif leading-tight">
                  小朋友，今天我们来<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-yellow-500">开启写作大冒险</span>吧！
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {ESSAY_UNITS.map((unit, idx) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.03, rotate: idx % 2 === 0 ? 1 : -1 }}
                    onClick={() => setSelectedUnit(unit)}
                    className="group cursor-pointer bg-white border-4 border-yellow-100 rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl hover:border-yellow-300 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-6">
                        <span className="px-4 py-1.5 bg-orange-100 text-orange-700 text-xs font-black rounded-full uppercase tracking-widest">
                          {unit.title}
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-inner">
                          <ChevronRight size={24} />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 mb-3 group-hover:text-orange-600 transition-colors serif">{unit.topic}</h3>
                      <p className="text-gray-500 font-medium leading-relaxed">
                        {unit.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="adventure"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Progress Bar */}
              <div className="bg-white rounded-full h-6 p-1 border-2 border-yellow-200 shadow-inner overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full relative"
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-orange-500 shadow-sm"></div>
                </motion.div>
              </div>

              {generatedEssays.length === 0 ? (
                <div className="max-w-4xl mx-auto">
                  <AnimatePresence mode="wait">
                    {!isTechniquePhase ? (
                      /* Questioning Phase */
                      <motion.div 
                        key="adventure"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white border-4 border-yellow-200 rounded-[3rem] p-10 shadow-xl relative"
                      >
                    <div className="absolute -top-6 left-10 px-6 py-2 bg-orange-500 text-white rounded-full font-black shadow-lg">
                      {selectedUnit.steps[currentStep].name}
                    </div>
                    
                    <div className="space-y-8">
                      <div className="flex items-start gap-6">
                        <div className="w-16 h-16 bg-yellow-100 rounded-3xl flex items-center justify-center text-yellow-600 shrink-0 shadow-inner">
                          <Smile size={40} />
                        </div>
                        <div className="space-y-2 pt-2">
                          <h3 className="text-2xl font-black text-orange-900 serif">
                            {selectedUnit.steps[currentStep].questions[currentQuestionIdx]}
                          </h3>
                          <p className="text-gray-400 font-medium">小朋友，想一想，写在这里吧：</p>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          autoFocus
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          placeholder={selectedUnit.steps[currentStep].placeholders[currentQuestionIdx]}
                          className="w-full h-40 p-8 rounded-[2rem] bg-yellow-50/50 border-4 border-dashed border-yellow-200 focus:border-orange-400 focus:bg-white focus:ring-0 transition-all text-xl font-medium text-gray-800 leading-relaxed placeholder:text-gray-300"
                        />
                        <div className="absolute bottom-4 right-8 flex items-center gap-2 text-yellow-600 font-bold text-sm">
                          <Lightbulb size={16} />
                          <span>小贴士：{selectedUnit.steps[currentStep].tips[currentQuestionIdx % selectedUnit.steps[currentStep].tips.length]}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <button
                            onClick={handlePrevQuestion}
                            disabled={currentStep === 0 && currentQuestionIdx === 0}
                            className="flex items-center gap-2 px-6 py-4 bg-white border-4 border-yellow-200 text-orange-600 rounded-2xl font-black hover:bg-yellow-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                          >
                            <ChevronLeft size={24} />
                            <span>上一题</span>
                          </button>
                          <div className="flex gap-2">
                            {selectedUnit.steps[currentStep].questions.map((_, i) => (
                              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i === currentQuestionIdx ? 'bg-orange-500 w-8' : 'bg-yellow-200'}`}></div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleNextQuestion}
                          disabled={!currentAnswer.trim()}
                          className="group flex items-center gap-3 px-10 py-4 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-orange-100"
                        >
                          <span>{currentQuestionIdx === selectedUnit.steps[currentStep].questions.length - 1 && currentStep === selectedUnit.steps.length - 1 ? '完成大冒险' : '下一题'}</span>
                          <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                    /* Writing Technique Phase */
                    <motion.div 
                      key="technique"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white border-8 border-orange-100 rounded-[4rem] p-12 shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[4rem] -z-10"></div>
                      
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-white shadow-lg -rotate-3">
                            <GraduationCap size={32} />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black text-gray-800 serif">写作小课堂</h2>
                            <p className="text-orange-500 font-bold">学习新技巧，让作文更出彩！</p>
                          </div>
                        </div>
                        <button 
                          onClick={resetState}
                          className="p-3 text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          <Home size={28} />
                        </button>
                      </div>

                      <div className="space-y-8 mb-10">
                        <div className="bg-orange-50/50 rounded-[2rem] p-8 border-2 border-orange-100">
                          <h3 className="text-2xl font-black text-orange-800 mb-4 flex items-center gap-2">
                            <Lightbulb className="text-yellow-500" />
                            {selectedUnit.writingTechnique.title}
                          </h3>
                          <p className="text-lg text-gray-700 leading-relaxed mb-6">
                            {selectedUnit.writingTechnique.description}
                          </p>
                          <div className="space-y-3">
                            <p className="font-bold text-orange-600">看看例子：</p>
                            {selectedUnit.writingTechnique.examples.map((ex, i) => (
                              <div key={i} className="flex items-start gap-2 text-gray-600 bg-white/80 p-3 rounded-xl border border-orange-50">
                                <CheckCircle2 size={18} className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{ex}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            <Sparkles className="text-orange-500" />
                            小试牛刀
                          </h3>
                          <p className="text-lg text-orange-600 font-bold italic">
                            {selectedUnit.writingTechnique.practicePrompt}
                          </p>
                          <textarea 
                            value={practiceAnswer}
                            onChange={(e) => setPracticeAnswer(e.target.value)}
                            placeholder="在这里写下你的练笔吧..."
                            className="w-full h-32 p-6 bg-white border-4 border-orange-100 rounded-[2rem] text-xl font-medium focus:outline-none focus:border-orange-300 transition-all placeholder:text-orange-100"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <button
                          onClick={handlePrevQuestion}
                          className="flex items-center gap-2 px-6 py-4 bg-white border-4 border-yellow-200 text-orange-600 rounded-2xl font-black hover:bg-yellow-50 transition-all shadow-lg"
                        >
                          <ChevronLeft size={24} />
                          <span>返回修改</span>
                        </button>
                        <button
                          onClick={handleGenerateEssays}
                          disabled={!practiceAnswer.trim()}
                          className="group flex items-center gap-3 px-10 py-4 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-orange-100"
                        >
                          <span>生成作文草稿</span>
                          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Previous Answers Summary */}
                {Object.keys(answers).length > 0 && (
                  <div className="bg-white/50 border-2 border-yellow-100 rounded-[2rem] p-6 mt-8">
                    <h4 className="text-sm font-black text-orange-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <PenTool size={16} />
                      你的写作足迹
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.values(answers).map((ans, i) => (
                        <div key={i} className="px-4 py-2 bg-white rounded-full border border-yellow-200 text-sm font-medium text-gray-600 shadow-sm">
                          {ans}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : viewingEssayIdx !== null ? (
                /* Detail View Phase */
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="max-w-4xl mx-auto space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setViewingEssayIdx(null)}
                      className="flex items-center gap-2 text-orange-600 font-black hover:text-orange-700 transition-colors"
                    >
                      <ChevronLeft size={24} />
                      <span>返回列表</span>
                    </button>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleDownloadEssay(generatedEssays[viewingEssayIdx])}
                        className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-2xl font-black hover:bg-green-600 transition-all shadow-lg"
                      >
                        <PenTool size={20} />
                        <span>下载到桌面打印</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border-8 border-orange-50 rounded-[4rem] p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[4rem] opacity-50"></div>
                    <div className="relative z-10 space-y-10">
                      <h2 className="text-4xl font-black text-gray-800 text-center serif leading-tight">
                        《{generatedEssays[viewingEssayIdx].title}》
                      </h2>
                      <div className="w-24 h-2 bg-orange-200 mx-auto rounded-full"></div>
                      <div className="prose prose-orange max-w-none">
                        <p className="text-xl text-gray-700 leading-[2.5] font-medium whitespace-pre-wrap serif">
                          {generatedEssays[viewingEssayIdx].content}
                        </p>
                      </div>
                      <div className="pt-10 border-t-4 border-dashed border-orange-50 flex justify-center">
                        <div className="flex items-center gap-4 text-orange-400 font-bold italic">
                          <Sparkles size={24} />
                          <span>这是一篇很棒的草稿，试着在上面修改出你的风格吧！</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Results Phase */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <div className="inline-block p-4 bg-yellow-400 text-white rounded-full shadow-lg mb-4">
                      <Trophy size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-orange-900 serif">太棒了！你的作文灵感宝库已开启</h2>
                    <p className="text-gray-500 font-medium">老师根据你的回答，为你准备了4篇适合修改和借鉴的作文草稿，点击卡片查看全文吧！</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {generatedEssays.map((essay, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setViewingEssayIdx(idx)}
                        className="bg-white border-4 border-orange-100 rounded-[3rem] p-8 shadow-xl hover:shadow-2xl transition-all relative group flex flex-col cursor-pointer"
                      >
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-black shadow-lg transform -rotate-12">
                          {idx + 1}
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-6 text-center serif border-b-2 border-orange-50 pb-4">《{essay.title}》</h3>
                        <div className="prose prose-orange max-w-none flex-grow overflow-hidden">
                          <p className="text-gray-700 leading-loose font-medium whitespace-pre-wrap text-sm line-clamp-6">
                            {essay.content}
                          </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-orange-50 flex justify-center">
                          <button className="flex items-center gap-2 text-orange-500 font-black group-hover:text-orange-600 transition-colors text-sm">
                            <BookOpen size={18} />
                            <span>点击查看全文</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex justify-center gap-6 pt-8">
                    <button 
                      onClick={resetState}
                      className="flex items-center gap-2 px-8 py-4 bg-white border-4 border-yellow-200 text-orange-600 rounded-2xl font-black hover:bg-yellow-50 transition-all shadow-lg"
                    >
                      <RefreshCw size={24} />
                      再来一组
                    </button>
                  </div>
                </motion.div>
              ) }

              {/* Loading State */}
              <AnimatePresence>
                {isAiLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-yellow-50/80 backdrop-blur-sm flex items-center justify-center"
                  >
                    <div className="text-center space-y-6">
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-24 h-24 border-8 border-yellow-200 border-t-orange-500 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-orange-500">
                          <PenTool size={32} className="animate-bounce" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-orange-900 serif">AI老师正在努力构思中...</h3>
                      <p className="text-orange-600 font-bold animate-pulse">正在把你的精彩回答变成范文哦！</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t-4 border-yellow-100 py-16 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-200 via-orange-200 to-yellow-200"></div>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
              <GraduationCap size={24} />
            </div>
            <div>
              <span className="font-black text-xl text-orange-900 serif">作文小状元</span>
              <p className="text-xs text-gray-400 font-bold">快乐写作，从这里开始</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-orange-500 font-black text-2xl">8</div>
              <div className="text-xs text-gray-400 font-bold">同步单元</div>
            </div>
            <div className="w-px h-10 bg-yellow-100"></div>
            <div className="text-center">
              <div className="text-orange-500 font-black text-2xl">AI</div>
              <div className="text-xs text-gray-400 font-bold">智能指导</div>
            </div>
          </div>
          <p className="text-gray-300 text-xs font-bold">
            © 2026 快乐写作乐园 · 陪伴孩子成长的每一步
          </p>
        </div>
      </footer>

      {/* Confetti Placeholder (Visual only) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[110]">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                top: -20, 
                left: `${Math.random() * 100}%`,
                rotate: 0,
                scale: 0
              }}
              animate={{ 
                top: '100%', 
                rotate: 360,
                scale: 1
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                repeat: 0,
                ease: "linear"
              }}
              className={`absolute w-4 h-4 rounded-sm ${['bg-yellow-400', 'bg-orange-400', 'bg-blue-400', 'bg-pink-400'][i % 4]}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
