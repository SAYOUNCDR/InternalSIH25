import { useState } from "react";
import ArrowSvg from "../assets/arrow-right-thin-svgrepo-com.svg";
import HowItWorks from "../assets/HowItWorks.svg";
import FeatureCards from "./FeatureCards";
import LanguageSwitcher from "./LanguageSwitcher";
import Signup from "./Signup"; // Done

const Hero = () => {
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-4 mb-15">
        <div className="text-xl font-medium text-gray-900">Archon </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSignupOpen(true)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors border border-gray-300 rounded-full shadow-sm hover:shadow-md cursor-pointer"
          >
            Login/Sign Up
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">i</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Decorative Labels */}
          <div className="absolute -top-16 left-0 text-gray-400 text-lg font-light italic transform -rotate-12">
            Smart
          </div>
          <div className="absolute -top-8 right-16 text-gray-400 text-sm border border-gray-300 rounded-full px-3 py-1">
            LANGUAGE AGNOSTIC AI
          </div>
          <div className="absolute -bottom-16 right-0 text-gray-400 text-lg font-light italic transform rotate-12">
            Contextual
          </div>
          <div className="absolute -bottom-20 left-8 text-gray-400 text-lg font-light italic transform -rotate-6">
            Guide
          </div>

          {/* Main Heading */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-6 text-6xl font-bold text-gray-900">
              <span>Clear</span>
              <LanguageSwitcher />
              <span>on</span>
            </div>
            <div className="text-6xl font-bold text-gray-900">
              Exams, Policies & More.
            </div>
          </div>

          {/* Subtitle */}
          <p className="mt-8 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Get instant, clear replies to queries on your university's official
            documents
            <br />
            in a simplified easy-to-read format
          </p>

          {/* Search Bar */}
          <div className="mt-12">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Ask me anything..."
                className="w-full px-6 py-4 text-gray-300 bg-gray-900 rounded-full border-none outline-none text-lg placeholder-white"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
                <button className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
                <button className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Arrow */}
      <div className="text-center pb-8 mt-40">
        <img src={ArrowSvg} alt="Scroll Down" className="w-8 h-8 mx-auto" />
      </div>

      {/* Feature card */}
      <div className="flex  items-center justify-center mb-20">
        <FeatureCards />
      </div>

      {/* How it works */}
      <div className="flex  items-center justify-center mb-30">
        <img src={HowItWorks} alt="" />
      </div>

      {/* Build by students bla bla */}
      <div className="flex justify-center items-center space-x-4 mb-[100px]">
        <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
          Build for Students
        </span>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
          Backed by Admins
        </span>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
          Loved by everyone
        </span>
      </div>

      {/* Ready to get your doubts cleared */}
      <div className="flex justify-center items-center space-x-6 py-16 bg-gray-50 mb-[100px]">
        <p className="text-xl text-gray-800 italic">
          Ready to get your doubts cleared?
        </p>
        <button className="bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white hover:text-black transition-colors cursor-pointer">
          Start chatting now →
        </button>
      </div>

      {/* Signup Modal */}
      <Signup isOpen={isSignupOpen} onClose={() => setIsSignupOpen(false)} />
    </div>
  );
};

export default Hero;