// ============================================================
// CodeQuest — Lesson Page
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import DragDropActivity from '../components/DragDropActivity';
import CodingPuzzle from '../components/CodingPuzzle';
import QuizPlayer from '../components/QuizPlayer';

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [tab, setTab] = useState<'learn' | 'activity' | 'quiz'>('learn');
  const [activityDone, setActivityDone] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadLesson(parseInt(id));
  }, [id]);

  const loadLesson = async (lessonId: number) => {
    try {
      const [lessonRes, quizRes] = await Promise.all([
        api.getLesson(lessonId),
        api.getLessonQuiz(lessonId).catch(() => null),
      ]);
      let lessonData = lessonRes.data;
      if (lessonData && (lessonData.id === 6 || lessonData.title?.includes('Making Decisions'))) {
        if (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.length < 7) {
          lessonData = {
            ...lessonData,
            activity_data: {
              ...lessonData.activity_data,
              instructions: 'Help the robot navigate the maze! Use IF blocks to handle walls.',
              availableBlocks: [
                { id: 'move-m', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'if-wall', type: 'if-wall', label: '🟩 If Wall → Turn Left', color: '#2ECC71', turnDirection: 'left' },
                { id: 'move-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'turn-r-m', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'move-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' }
              ],
              correctSequence: ['move-m', 'if-wall', 'move-m2', 'move-m3', 'turn-r-m', 'move-m4', 'move-m5'],
              gridSize: { rows: 3, cols: 4 },
              startPosition: { row: 2, col: 0 },
              endPosition: { row: 0, col: 3 },
              walls: [{ row: 2, col: 2 }],
              characterEmoji: '🤖',
              goalEmoji: '🏁'
            }
          };
        }
      }
      if (lessonData && (lessonData.id === 7 || lessonData.title?.includes('Variables') || (lessonData.example && (lessonData.example.includes('StepActioncoins') || lessonData.example.includes('coins value'))))) {
        const activityData = (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.length < 9)
          ? {
              ...lessonData.activity_data,
              instructions: 'Help the robot collect all 3 coins! Watch the coin counter variable change as you collect them.',
              availableBlocks: [
                { id: 'move-v1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'pick-1', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
                { id: 'move-v2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-v3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'pick-2', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
                { id: 'move-v4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'move-v5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'pick-3', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
                { id: 'move-v6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' }
              ],
              correctSequence: ['move-v1', 'pick-1', 'move-v2', 'move-v3', 'pick-2', 'move-v4', 'move-v5', 'pick-3', 'move-v6'],
              gridSize: { rows: 1, cols: 7 },
              startPosition: { row: 0, col: 0 },
              endPosition: { row: 0, col: 6 },
              collectibles: [{ row: 0, col: 1 }, { row: 0, col: 3 }, { row: 0, col: 5 }],
              characterEmoji: '🤖',
              goalEmoji: '🏆'
            }
          : lessonData.activity_data;

        lessonData = {
          ...lessonData,
          activity_data: activityData,
          example: `## Example: Counting Coins 🪙\n\n**Variable:** \`coins = 0\`\n\n| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\` |\n\nThe variable **"coins"** keeps track of how many coins we've collected!\n\nAt the end, we can check: *"Do we have 3 coins?"* ✅`
        };
      }
      if (lessonData && (lessonData.id === 9 || lessonData.title === 'Build Your Own!' || lessonData.title?.includes('Build Your Own'))) {
        lessonData = {
          ...lessonData,
          activity_data: {
            ...lessonData.activity_data,
            instructions: 'Welcome to the Champion Playground! 🎨 Build your own program to collect coins, navigate the castle pillars, and reach the trophy! There are many ways to solve it — be creative!',
            gameType: 'free-play',
            availableBlocks: [
              { id: 'fp-move1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
              { id: 'fp-move2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
              { id: 'fp-move3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
              { id: 'fp-move4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
              { id: 'fp-move5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
              { id: 'fp-move6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
              { id: 'fp-turnl', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
              { id: 'fp-turnr', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
              { id: 'fp-turnl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
              { id: 'fp-turnr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
              { id: 'fp-repeat', type: 'repeat', label: '🔁 Repeat 2 times', color: '#FF9F43', repeatCount: 2 },
              { id: 'fp-repeat3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#FF9F43', repeatCount: 3 },
              { id: 'fp-pickup1', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
              { id: 'fp-pickup2', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
              { id: 'fp-pickup3', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' },
              { id: 'fp-pickup4', type: 'pick-up', label: '🟡 Pick Up Coin', color: '#FECA57' }
            ],
            gridSize: { rows: 5, cols: 5 },
            startPosition: { row: 4, col: 0 },
            endPosition: { row: 0, col: 4 },
            walls: [
              { row: 1, col: 1 },
              { row: 1, col: 3 },
              { row: 3, col: 1 },
              { row: 3, col: 3 }
            ],
            collectibles: [
              { row: 0, col: 2 },
              { row: 2, col: 0 },
              { row: 2, col: 2 },
              { row: 2, col: 4 },
              { row: 4, col: 2 }
            ],
            objectives: [
              'Collect at least 2 coins 🪙',
              'Use at least 4 blocks 🧱',
              'Reach the trophy 🏆 or visit 5+ squares!'
            ],
            characterEmoji: '🤖',
            goalEmoji: '🏆'
          }
        };
      }

      // Lesson 10 / Magic Functions (Space Theme)
      if (
        lessonData &&
        (lessonData.title?.includes('Magic Functions') ||
         lessonData.title?.includes('Reusable Spells') ||
         (lessonData.id === 10 && !lessonData.title?.includes('Variables')) ||
         (lessonData.id === 11 && (lessonData.title?.includes('Magic') || lessonData.activity_data?.theme === 'space' || !lessonData.title?.includes('Bug'))))
      ) {
        if (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.filter((b: any) => b.type === 'move').length < 6) {
          lessonData = {
            ...lessonData,
            activity_data: {
              ...lessonData.activity_data,
              instructions: 'Define your cosmic movement spell! Guide the rocket around asteroids, collect the energy stars, and dock at Saturn!',
              theme: 'space',
              characterEmoji: '🚀',
              goalEmoji: '🪐',
              gridSize: { rows: 4, cols: 5 },
              startPosition: { row: 0, col: 0 },
              endPosition: { row: 3, col: 4 },
              walls: [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
              collectibles: [{ row: 0, col: 3 }, { row: 2, col: 4 }],
              availableBlocks: [
                { id: 'l10-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l10-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l10-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l10-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l10-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l10-r2-1', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l10-r2-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l10-r3-1', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
              ],
              hints: [
                'Fly straight right across Row 0 to collect the first energy star at (0, 3).',
                'Turn Right at (0, 4) to face South, safely bypassing the asteroid cluster.',
                'Fly straight down Column 4 to reach Saturn at (3, 4)! Use Repeat blocks for a 3-star rating!'
              ],
              maxBlocksStar: 6,
            }
          };
        }
      }

      // Lesson 11 / The Bug Detective (Castle Theme)
      if (
        lessonData &&
        (lessonData.title?.includes('Bug Detective') ||
         lessonData.title?.includes('Finding & Fixing Errors') ||
         (lessonData.id === 11 && lessonData.title?.includes('Bug')))
      ) {
        if (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.filter((b: any) => b.type === 'move').length < 6) {
          lessonData = {
            ...lessonData,
            activity_data: {
              ...lessonData.activity_data,
              instructions: 'Be a bug detective! The old program had wall collisions. Plan the correct route through the castle corridor.',
              theme: 'castle',
              characterEmoji: '🧙‍♂️',
              goalEmoji: '👑',
              gridSize: { rows: 4, cols: 4 },
              startPosition: { row: 0, col: 0 },
              endPosition: { row: 3, col: 3 },
              walls: [{ row: 0, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
              collectibles: [{ row: 1, col: 0 }, { row: 3, col: 1 }],
              availableBlocks: [
                { id: 'l11-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l11-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l11-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l11-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l11-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l11-r2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l11-r3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
              ],
              hints: [
                'The top path is blocked by castle walls. Turn Right to head South down column 0!',
                'Collect the first crystal at (1, 0) and continue to the bottom corner (3, 0).',
                'Turn Left to face East and head straight towards the Crown at (3, 3)!'
              ],
              maxBlocksStar: 7,
            }
          };
        }
      }

      // Lesson 12 / Nested Loops (Forest Theme)
      if (
        lessonData &&
        (lessonData.title?.includes('Nested Loops') ||
         lessonData.title?.includes('Loops Inside Loops') ||
         (lessonData.id === 12) ||
         (lessonData.id === 13 && lessonData.title?.includes('Nested')))
      ) {
        if (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.filter((b: any) => b.type === 'repeat').length < 7) {
          lessonData = {
            ...lessonData,
            activity_data: {
              ...lessonData.activity_data,
              instructions: 'Use nested loops to sweep the enchanted forest and gather all magical crystals!',
              theme: 'forest',
              characterEmoji: '🦊',
              goalEmoji: '🌳',
              gridSize: { rows: 5, cols: 5 },
              startPosition: { row: 0, col: 0 },
              endPosition: { row: 4, col: 4 },
              walls: [{ row: 1, col: 2 }, { row: 3, col: 2 }],
              collectibles: [{ row: 0, col: 2 }, { row: 2, col: 2 }, { row: 4, col: 2 }],
              availableBlocks: [
                { id: 'l12-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l12-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l12-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l12-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l12-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l12-r2-1', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l12-r2-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l12-r2-3', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l12-r2-4', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l12-r2-5', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l12-r2-6', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l12-r3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
                { id: 'l12-r4', type: 'repeat', label: '🔁 Repeat 4 times', color: '#da77f2', repeatCount: 4 },
              ],
              hints: [
                'Repeat blocks allow you to glide through multiple squares with minimal code.',
                'Collect all 3 coins on your path to the Ancient Tree at (4, 4).'
              ],
              maxBlocksStar: 6,
            }
          };
        }
      }

      // Lesson 13 / 14: The Grand Master Quest (Citadel Gate Theme)
      if (
        lessonData &&
        (lessonData.title?.includes('Grand Master') ||
         lessonData.title?.includes('Citadel') ||
         ((lessonData.id === 13 || lessonData.id === 14) && !lessonData.title?.includes('Nested')))
      ) {
        if (!lessonData.activity_data?.availableBlocks || lessonData.activity_data.availableBlocks.filter((b: any) => b.type === 'repeat').length < 7 || lessonData.activity_data.availableBlocks.filter((b: any) => b.type === 'turn-right').length < 3) {
          lessonData = {
            ...lessonData,
            activity_data: {
              ...lessonData.activity_data,
              instructions: 'The Grand Master Challenge! Find the Key 🗝️ to unlock the Cosmic Gate 🚪, gather the crystals, and reach the Citadel Core!',
              theme: 'space',
              characterEmoji: '🚀',
              goalEmoji: '🌌',
              gridSize: { rows: 5, cols: 5 },
              startPosition: { row: 0, col: 0 },
              endPosition: { row: 4, col: 4 },
              keys: [{ row: 0, col: 4 }],
              doors: [{ row: 2, col: 2 }],
              walls: [{ row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 3 }],
              collectibles: [{ row: 1, col: 4 }, { row: 4, col: 1 }],
              availableBlocks: [
                { id: 'l13-m1', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m2', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m3', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m4', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m5', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m6', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m7', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m8', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m9', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m10', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m11', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-m12', type: 'move', label: '🔵 Move Forward', color: '#54A0FF' },
                { id: 'l13-tr1', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l13-tr2', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l13-tr3', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l13-tr4', type: 'turn-right', label: '🟢 Turn Right', color: '#01A3A4' },
                { id: 'l13-tl1', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l13-tl2', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l13-tl3', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l13-tl4', type: 'turn-left', label: '🟠 Turn Left', color: '#FF9F43' },
                { id: 'l13-r2-1', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l13-r2-2', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l13-r2-3', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l13-r2-4', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l13-r2-5', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l13-r2-6', type: 'repeat', label: '🔁 Repeat 2 times', color: '#da77f2', repeatCount: 2 },
                { id: 'l13-r3', type: 'repeat', label: '🔁 Repeat 3 times', color: '#da77f2', repeatCount: 3 },
                { id: 'l13-r4', type: 'repeat', label: '🔁 Repeat 4 times', color: '#da77f2', repeatCount: 4 },
              ],
              hints: [
                'Head straight right across the top row to collect the Key at (0, 4).',
                'Once you have the Key, the locked gate at (2, 2) can be opened.',
                'Pass through the gate and fly to the Citadel Core at (4, 4)!'
              ],
              maxBlocksStar: 18,
            }
          };
        }
      }
      setLesson(lessonData);
      if (quizRes) setQuiz(quizRes.data);
    } catch (err) {
      console.error('Failed to load lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityComplete = async () => {
    setActivityDone(true);
    if (id) {
      try {
        await api.completeActivity(parseInt(id));
      } catch (err) {
        console.error('Failed to save activity progress:', err);
      }
    }
  };

  const handleQuizSubmit = async (answers: any[]) => {
    if (!quiz) return;
    try {
      const res = await api.submitQuiz(quiz.id, answers);
      setQuizResult(res.data);
      if (res.data.passed) {
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return '';

    // If squished or raw unformatted table text was loaded, format it into a clean markdown table
    let cleanText = text.replace(
      /Step\s*Action\s*coins\s*value[\s\-]*1\s*Pick\s*up\s*coin\s*coins\s*=\s*1[\s\-]*2\s*Pick\s*up\s*coin\s*coins\s*=\s*2[\s\-]*3\s*Pick\s*up\s*coin\s*coins\s*=\s*3/gi,
      `| Step | Action | coins value |\n|:---:|:---|:---|\n| 1 | 🪙 Pick up coin | \`coins = 1\` |\n| 2 | 🪙 Pick up coin | \`coins = 2\` |\n| 3 | 🪙 Pick up coin | \`coins = 3\``
    );

    const formatInline = (str: string) => {
      return str
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    };

    const lines = cleanText.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Headers
      if (/^### (.+)$/.test(trimmed)) {
        const match = trimmed.match(/^### (.+)$/);
        result.push(`<h3>${formatInline(match ? match[1] : '')}</h3>`);
        i++;
        continue;
      }
      if (/^## (.+)$/.test(trimmed)) {
        const match = trimmed.match(/^## (.+)$/);
        result.push(`<h2>${formatInline(match ? match[1] : '')}</h2>`);
        i++;
        continue;
      }
      if (/^# (.+)$/.test(trimmed)) {
        const match = trimmed.match(/^# (.+)$/);
        result.push(`<h1>${formatInline(match ? match[1] : '')}</h1>`);
        i++;
        continue;
      }

      // Markdown Table: block of lines starting and ending with |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parseRow = (rowStr: string) => {
            const raw = rowStr.split('|');
            if (raw.length > 0 && raw[0].trim() === '') raw.shift();
            if (raw.length > 0 && raw[raw.length - 1].trim() === '') raw.pop();
            return raw.map(c => c.trim());
          };

          const isSeparator = (rowStr: string) => {
            const cells = parseRow(rowStr);
            return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
          };

          const getAlignments = (delimiterStr: string) => {
            const cells = parseRow(delimiterStr);
            return cells.map(c => {
              const left = c.startsWith(':');
              const right = c.endsWith(':');
              if (left && right) return 'center';
              if (right) return 'right';
              return 'left';
            });
          };

          const headerCells = parseRow(tableLines[0]);
          let hasHeader = false;
          let alignments: string[] = [];
          let dataStartIndex = 1;

          if (tableLines.length > 1 && isSeparator(tableLines[1])) {
            hasHeader = true;
            alignments = getAlignments(tableLines[1]);
            dataStartIndex = 2;
          }

          let tableHtml = '<div class="lesson-table-wrapper"><table class="lesson-table">';
          if (hasHeader) {
            tableHtml += '<thead><tr>';
            headerCells.forEach((cell, idx) => {
              const align = alignments[idx] || 'left';
              tableHtml += `<th style="text-align: ${align}">${formatInline(cell)}</th>`;
            });
            tableHtml += '</tr></thead>';
          }

          tableHtml += '<tbody>';
          const start = hasHeader ? dataStartIndex : 0;
          for (let r = start; r < tableLines.length; r++) {
            if (isSeparator(tableLines[r])) continue;
            const cells = parseRow(tableLines[r]);
            tableHtml += '<tr>';
            cells.forEach((cell, idx) => {
              const align = alignments[idx] || 'left';
              tableHtml += `<td style="text-align: ${align}">${formatInline(cell)}</td>`;
            });
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody></table></div>';
          result.push(tableHtml);
          continue;
        }
      }

      // Unordered list
      if (/^[-*]\s+(.+)$/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*]\s+(.+)$/.test(lines[i].trim())) {
          const match = lines[i].trim().match(/^[-*]\s+(.+)$/);
          listItems.push(`<li>${formatInline(match ? match[1] : '')}</li>`);
          i++;
        }
        result.push(`<ul>${listItems.join('')}</ul>`);
        continue;
      }

      // Ordered list
      if (/^\d+\.\s+(.+)$/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+(.+)$/.test(lines[i].trim())) {
          const match = lines[i].trim().match(/^\d+\.\s+(.+)$/);
          listItems.push(`<li>${formatInline(match ? match[1] : '')}</li>`);
          i++;
        }
        result.push(`<ol>${listItems.join('')}</ol>`);
        continue;
      }

      // Regular paragraph
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^#{1,3}\s/.test(lines[i].trim()) &&
        !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
        !/^[-*]\s/.test(lines[i].trim()) &&
        !/^\d+\.\s/.test(lines[i].trim())
      ) {
        pLines.push(formatInline(lines[i].trim()));
        i++;
      }
      if (pLines.length > 0) {
        result.push(`<p>${pLines.join('<br/>')}</p>`);
      }
    }

    return result.join('\n');
  };

  if (loading) return <div className="loading-spinner">🚀</div>;
  if (!lesson) return <div className="page-container"><div className="empty-state"><span className="empty-state-emoji">😢</span><p>Lesson not found</p></div></div>;

  return (
    <div className="lesson-content">
      {/* Header */}
      <div className="flex-between mb-lg">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/learn')}>
          ← Back to Map
        </button>
        <span className="text-muted" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {lesson.level_title}
        </span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)' }}>{lesson.title}</h1>

      {/* Tabs */}
      <div className="lesson-tabs">
        <button
          className={`lesson-tab ${tab === 'learn' ? 'active' : ''}`}
          onClick={() => setTab('learn')}
        >
          📖 Learn
        </button>
        <button
          className={`lesson-tab ${tab === 'activity' ? 'active' : ''} ${activityDone ? 'completed-tab' : ''}`}
          onClick={() => setTab('activity')}
        >
          🧩 Activity
        </button>
        <button
          className={`lesson-tab ${tab === 'quiz' ? 'active' : ''} ${quizResult ? 'completed-tab' : ''}`}
          onClick={() => setTab('quiz')}
          disabled={!quiz}
        >
          📝 Quiz
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'learn' && (
        <div className="card">
          <div className="lesson-explanation">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.explanation) }} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>📌 Example</h3>
            <div className="lesson-explanation">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.example) }} />
            </div>
          </div>
          <div className="text-center mt-xl">
            <button className="btn btn-primary btn-lg" onClick={() => setTab('activity')}>
              Ready? Start the Activity! 🧩
            </button>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {lesson.activity_type === 'drag-drop' && (
              <DragDropActivity
                activity={lesson.activity_data}
                onComplete={handleActivityComplete}
                onGoToQuiz={() => setTab('quiz')}
              />
            )}
            {(lesson.activity_type === 'puzzle' || lesson.activity_type === 'pattern') && (
              <CodingPuzzle
                activity={lesson.activity_data}
                onComplete={handleActivityComplete}
              />
            )}
            {lesson.activity_type === 'game' && (
              <DragDropActivity
                activity={{
                  ...lesson.activity_data,
                  correctSequence: [], // Free play - any sequence works
                }}
                onComplete={handleActivityComplete}
                onGoToQuiz={() => setTab('quiz')}
              />
            )}
          </div>

          {activityDone && quiz && (
            <div
              className="card mt-lg text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.08), rgba(0, 99, 156, 0.08))',
                border: '2px solid var(--color-accent-green)',
                padding: 'var(--space-xl)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-xs)' }}>🎉</div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)', marginBottom: 'var(--space-xs)' }}>
                Activity Completed!
              </h3>
              <p className="text-muted mb-lg">
                Great job! You can keep playing and experimenting with your code, or take the quiz when you're ready.
              </p>
              <button
                className="btn btn-success btn-lg"
                onClick={() => setTab('quiz')}
                style={{ fontSize: '1.1rem', padding: 'var(--space-md) var(--space-xl)', boxShadow: 'var(--shadow-btn)' }}
              >
                📝 Ready for Quiz? Take Quiz →
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'quiz' && quiz && !quizResult && (
        <div className="card">
          <QuizPlayer
            questions={quiz.questions}
            quizId={quiz.id}
            onSubmit={handleQuizSubmit}
          />
        </div>
      )}

      {tab === 'quiz' && quizResult && (
        <div className="card text-center" style={{ padding: 'var(--space-3xl) var(--space-xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>
            {quizResult.passed ? '🎉' : '💪'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)', color: quizResult.passed ? 'var(--color-primary)' : 'var(--color-text)' }}>
            {quizResult.passed ? 'Quiz Passed!' : 'Keep Trying!'}
          </h2>

          <div className="dashboard-grid" style={{ maxWidth: '400px', margin: '0 auto var(--space-xl)' }}>
            <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
              <div className="stat-card-info" style={{ textAlign: 'center' }}>
                <div className="stat-card-value" style={{ color: quizResult.passed ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
                  {quizResult.score}%
                </div>
                <div className="stat-card-label">Score</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
              <div className="stat-card-info" style={{ textAlign: 'center' }}>
                <div className="stat-card-value">{quizResult.correct_count}/{quizResult.total_count}</div>
                <div className="stat-card-label">Correct</div>
              </div>
            </div>
          </div>

          {quizResult.passed && (
            <div className="mb-lg" style={{ maxWidth: '500px', margin: '0 auto var(--space-xl)' }}>
              <div className="alert alert-success text-center">
                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>⭐ You earned {quizResult.points_earned} points!</span>
              </div>
              {quizResult.badges_earned?.length > 0 && (
                <div className="alert alert-info mt-sm text-center">
                  <span style={{ fontWeight: 600 }}>🏅 New badge{quizResult.badges_earned.length > 1 ? 's' : ''}:</span>
                  <br/>
                  {quizResult.badges_earned.map((b: any) => `${b.icon_emoji} ${b.name}`).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex-center gap-md">
            {quizResult.passed ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/learn')}>
                Continue Learning →
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => { setQuizResult(null); }}>
                  🔄 Retry Quiz
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/learn')}>
                  Back to Map
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <>
          <Confetti />
          <div className="celebration-overlay" onClick={() => setShowCelebration(false)}>
            <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
              <div className="celebration-emoji">🏆</div>
              <h2 className="celebration-title">Awesome Job!</h2>
              <p className="celebration-text">
                You completed "{lesson.title}" and earned points!
              </p>
              <div className="celebration-stats">
                <div className="celebration-stat">
                  <div className="celebration-stat-value">{quizResult?.score}%</div>
                  <div className="celebration-stat-label">Quiz Score</div>
                </div>
                <div className="celebration-stat">
                  <div className="celebration-stat-value">+{quizResult?.points_earned}</div>
                  <div className="celebration-stat-label">Points</div>
                </div>
              </div>
              {quizResult?.badges_earned?.length > 0 && (
                <div className="mb-lg">
                  <p className="text-muted mb-sm" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    🎖️ New Badges:
                  </p>
                  <div className="celebration-badges-container">
                    {quizResult.badges_earned.map((badge: any) => (
                      <div key={badge.id} className="celebration-badge-item">
                        <span className="badge-emoji">{badge.icon_emoji}</span>
                        <span className="badge-name">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn btn-primary btn-lg" onClick={() => { setShowCelebration(false); navigate('/learn'); }}>
                🚀 Continue Adventure!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Confetti component
function Confetti() {
  const colors = ['#00639c', '#4dabf7', '#fed33a', '#4caf50', '#ff9800', '#7e57c2', '#ec407a'];
  const pieces = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: `${Math.random() * 2}s`,
    size: 8 + Math.random() * 12,
    shape: Math.random() > 0.5 ? '50%' : '0',
  }));

  return (
    <div className="confetti-container">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            borderRadius: piece.shape,
          }}
        />
      ))}
    </div>
  );
}
