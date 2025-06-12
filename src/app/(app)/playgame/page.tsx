
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaLiteracyTipsCard } from '@/components/dashboard/MediaLiteracyTipsCard';
import { generateFakeNewsArticle, type GenerateFakeNewsArticleInput, type GenerateFakeNewsArticleOutput } from '@/ai/flows/generate-fake-news-article';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Puzzle, CheckCircle, XCircle, Award, RotateCcw, Sparkles, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type GamePhase = "setup" | "playing" | "feedback" | "results";
type ArticleSourceParameters = Omit<GenerateFakeNewsArticleInput, 'topic'> & {topic?: string};

interface GameArticle {
  title: string;
  text: string;
  sourceParams: ArticleSourceParameters;
  correctAnswer: 'Real' | 'Fake';
  userGuess?: 'Real' | 'Fake';
  isCorrect?: boolean;
}

const ARTICLE_TOPICS = [
    "a new technology breakthrough", "a surprising celebrity announcement", "an unusual scientific discovery",
    "a local community event", "a political debate outcome", "a historical event reinterpretation",
    "a sports team's unexpected victory", "a financial market shift", "a strange weather phenomenon",
    "an educational reform proposal"
];
const ARTICLE_CATEGORIES = ["Technology", "Entertainment", "Science", "Local News", "Politics", "History", "Sports", "Business", "Environment", "Education"];
const ARTICLE_TONES = ["Neutral", "Formal", "Informal", "Humorous", "Serious", "Optimistic", "Pessimistic", "Sarcastic", "Sensationalist", "Scholarly"];

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function PlayGamePage() {
  const [gamePhase, setGamePhase] = useState<GamePhase>("setup");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameArticles, setGameArticles] = useState<GameArticle[]>([]);
  
  const [isLoadingGameSetup, setIsLoadingGameSetup] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{title: string, description: string, variant: "default" | "destructive"} | null>(null);

  const { toast } = useToast();

  const generateRandomArticleParams = (): GenerateFakeNewsArticleInput => {
    return {
        topic: getRandomElement(ARTICLE_TOPICS),
        category: getRandomElement(ARTICLE_CATEGORIES),
        tone: getRandomElement(ARTICLE_TONES),
    };
  };

  const handleStartGame = async () => {
    setIsLoadingGameSetup(true);
    setFeedbackMessage(null);
    toast({
        title: "Setting Up Your Game",
        description: "Generating articles, please wait a moment...",
        duration: numQuestions * 1000, 
    });

    try {
      const articlePromises: Promise<GameArticle | null>[] = Array.from({ length: numQuestions }).map(async (_, index) => {
        try {
          const params = generateRandomArticleParams();
          const result: GenerateFakeNewsArticleOutput = await generateFakeNewsArticle(params);
          if (!result.article) {
            console.error(`AI failed to generate article content for question ${index + 1}.`);
            toast({ title: `Article ${index + 1} generation failed`, description: "Skipping this article.", variant: "destructive", duration: 2000 });
            return null;
          }
          const title = `${params.category}: A ${params.tone.toLowerCase()} take on "${params.topic}"`;
          const correctAnswerForGame: 'Real' | 'Fake' = Math.random() < 0.5 ? 'Real' : 'Fake';
          
          return {
            title,
            text: result.article,
            sourceParams: params,
            correctAnswer: correctAnswerForGame
          };
        } catch (error) {
            console.error(`Error generating article for question ${index + 1}:`, error);
            toast({ title: `Article ${index + 1} generation error`, description: (error as Error).message, variant: "destructive", duration: 2000 });
            return null;
        }
      });

      const results = await Promise.all(articlePromises);
      const successfullyGeneratedArticles = results.filter(article => article !== null) as GameArticle[];

      if (successfullyGeneratedArticles.length === 0) {
         toast({
          title: "Game Setup Failed",
          description: "No articles could be generated. Please try adjusting settings or try again later.",
          variant: "destructive",
        });
        setGamePhase("setup");
        setIsLoadingGameSetup(false);
        return;
      }
      
      if (successfullyGeneratedArticles.length < numQuestions) {
        toast({
          title: "Game Setup Incomplete",
          description: `Successfully generated ${successfullyGeneratedArticles.length} out of ${numQuestions} articles. The game will proceed with the available articles.`,
          variant: "default", 
        });
        setNumQuestions(successfullyGeneratedArticles.length); 
      }
      
      setGameArticles(successfullyGeneratedArticles);
      setCurrentQuestionIndex(0);
      setScore(0);
      setGamePhase("playing");

    } catch (error: any) { 
      toast({
        title: "Game Setup Failed Critically",
        description: error.message || "Could not set up the game due to an unexpected error. Please try again.",
        variant: "destructive",
      });
      setGamePhase("setup");
    } finally {
      setIsLoadingGameSetup(false);
    }
  };

  const handleGuess = (guess: 'Real' | 'Fake') => {
    if (gameArticles.length <= currentQuestionIndex) return;

    const currentArticle = gameArticles[currentQuestionIndex];
    const isCorrect = guess === currentArticle.correctAnswer;

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedbackMessage({title: "Correct!", description: `The article was indeed presented as ${currentArticle.correctAnswer.toLowerCase()}.`, variant: "default"});
    } else {
      setFeedbackMessage({title: "Incorrect!", description: `This article was presented as ${currentArticle.correctAnswer.toLowerCase()}.`, variant: "destructive"});
    }
    
    const updatedArticles = [...gameArticles];
    updatedArticles[currentQuestionIndex] = { ...currentArticle, userGuess: guess, isCorrect };
    setGameArticles(updatedArticles);
    setGamePhase("feedback");
  };

  const handleNextQuestion = () => {
    setFeedbackMessage(null);
    if (currentQuestionIndex < gameArticles.length - 1) { 
      setCurrentQuestionIndex(prev => prev + 1);
      setGamePhase("playing");
    } else {
      setGamePhase("results");
    }
  };
  
  const handlePlayAgain = () => {
    setGamePhase("setup");
    setNumQuestions(5); 
  };

  const renderSetupPhase = () => (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl font-headline flex items-center"><Puzzle className="mr-3 h-7 w-7 text-primary"/>Guess Real or Fake?</CardTitle>
        <CardDescription>
          Test your media literacy skills! We'll generate some articles. You guess if they're meant to be Real or Fake in this game context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="numQuestions" className="text-base font-medium">Number of Questions:</Label>
          <RadioGroup
            id="numQuestions"
            value={String(numQuestions)}
            onValueChange={(value) => setNumQuestions(Number(value))}
            className="mt-2 grid grid-cols-3 gap-4"
            disabled={isLoadingGameSetup}
          >
            {[5, 10, 15].map(num => (
              <Label
                key={num}
                htmlFor={`num-${num}`}
                className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    numQuestions === num && "border-primary ring-2 ring-primary",
                    isLoadingGameSetup && "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem value={String(num)} id={`num-${num}`} className="sr-only" disabled={isLoadingGameSetup} />
                <span className="text-xl font-semibold">{num}</span>
                <span className="text-xs text-muted-foreground">Questions</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full" onClick={handleStartGame} disabled={isLoadingGameSetup}>
            {isLoadingGameSetup ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Setting up game...
                </>
            ) : (
                <>
                    <Sparkles className="mr-2 h-5 w-5" /> Start Game
                </>
            )}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPlayingPhase = () => {
    if (!gameArticles[currentQuestionIndex]) {
        return (
             <Card className="w-full max-w-2xl mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl md:text-2xl font-headline">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Could not load the current question. An article might have failed to generate.</p>
                    <Button onClick={handleNextQuestion} className="mt-4 mr-2">Skip to Next (if any)</Button>
                    <Button onClick={handlePlayAgain} variant="outline" className="mt-4">Play Again</Button>
                </CardContent>
            </Card>
        );
    }
    
    const { title: currentTitle, text: currentText } = gameArticles[currentQuestionIndex];

    return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl md:text-2xl font-headline">Question {currentQuestionIndex + 1} of {gameArticles.length}</CardTitle>
          <div className="text-lg font-semibold">Score: {score}</div>
        </div>
        <Progress value={((currentQuestionIndex + 1) / gameArticles.length) * 100} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="bg-secondary/30">
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg font-semibold">{currentTitle || "Article Title"}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground mb-2">Analyze the article snippet below:</p>
                <ScrollArea className="h-[200px] max-h-[250px] p-3 border rounded-md bg-background text-sm whitespace-pre-wrap">
                    {currentText || "Loading article..."}
                </ScrollArea>
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg py-6 border-2 border-green-500 hover:bg-green-500/10 hover:text-green-600 data-[active='true']:bg-green-500 data-[active='true']:text-white"
            onClick={() => handleGuess('Real')} 
            disabled={gamePhase === 'feedback'}
          >
            <CheckCircle className="mr-2 h-6 w-6"/> Real
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg py-6 border-2 border-red-500 hover:bg-red-500/10 hover:text-red-600 data-[active='true']:bg-red-500 data-[active='true']:text-white"
            onClick={() => handleGuess('Fake')} 
            disabled={gamePhase === 'feedback'}
          >
            <XCircle className="mr-2 h-6 w-6"/> Fake
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  }

  const renderFeedbackPhase = () => {
    if (!gameArticles[currentQuestionIndex]) {
         return <p>Error displaying feedback. Article not found.</p>; 
    }
    const { title: currentTitle, text: currentText } = gameArticles[currentQuestionIndex];
    return (
     <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl md:text-2xl font-headline">Question {currentQuestionIndex + 1} Result</CardTitle>
           <div className="text-lg font-semibold">Score: {score}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {feedbackMessage && (
          <Alert variant={feedbackMessage.variant === "default" ? "default" : "destructive"} className={cn(feedbackMessage.variant === 'default' ? 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700' : 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700')}>
            {feedbackMessage.variant === "default" ? 
                <CheckCircle className={cn("h-5 w-5", feedbackMessage.variant === "default" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} /> :
                <XCircle className={cn("h-5 w-5", feedbackMessage.variant === "default" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} />
            }
            <AlertTitle className={cn("font-semibold", feedbackMessage.variant === "default" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>{feedbackMessage.title}</AlertTitle>
            <AlertDescription className={cn(feedbackMessage.variant === "default" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
              {feedbackMessage.description}
            </AlertDescription>
          </Alert>
        )}
        <Card className="bg-secondary/20">
            <CardHeader className="pb-1 pt-3">
                 <CardTitle className="text-md font-medium">{currentTitle}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <ScrollArea className="h-[150px] max-h-[200px] text-sm whitespace-pre-wrap">
                    {currentText}
                </ScrollArea>
            </CardContent>
        </Card>
        <Button size="lg" className="w-full" onClick={handleNextQuestion}>
          {currentQuestionIndex < gameArticles.length - 1 ? "Next Question" : "Show Results"}
        </Button>
      </CardContent>
    </Card>
  );
  }


  const renderResultsPhase = () => {
    const finalScore = score;
    const totalQuestionsAttempted = gameArticles.length;
    const percentage = totalQuestionsAttempted > 0 ? ((finalScore / totalQuestionsAttempted) * 100).toFixed(1) : "0.0";
    
    let resultMessage = "";
    if (totalQuestionsAttempted === 0) {
        resultMessage = "No questions were played. Try starting a new game!";
    } else if (parseFloat(percentage) >= 80) {
        resultMessage = "Excellent job! You have a sharp eye for details.";
    } else if (parseFloat(percentage) >= 50) {
        resultMessage = "Good effort! Keep practicing to hone your skills.";
    } else {
        resultMessage = "No worries! Media literacy is a skill that improves with practice. Check the tips below.";
    }

    return (
    <div className="space-y-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="items-center text-center">
            <Award className="h-16 w-16 text-primary mb-3"/>
          <CardTitle className="text-3xl font-headline">Game Over!</CardTitle>
          <CardDescription>
            You scored {finalScore} out of {totalQuestionsAttempted} ({percentage}%).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <p className="text-lg">{resultMessage}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Button size="lg" className="w-full sm:w-auto" onClick={handlePlayAgain}>
                    <RotateCcw className="mr-2 h-5 w-5"/> Play Again
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-5 w-5"/> Go to Dashboard
                    </Link>
                </Button>
            </div>
        </CardContent>
      </Card>

      {totalQuestionsAttempted > 0 && (
          <Card className="w-full max-w-xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-headline">Your Answers:</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="max-h-[300px]">
                    <ul className="space-y-3">
                        {gameArticles.map((article, index) => (
                            <li key={index} className="p-3 border rounded-md flex justify-between items-center text-sm">
                                <div className="flex-1 overflow-hidden">
                                    <span className="font-medium block truncate pr-2" title={article.title}>Q{index + 1}: {article.title}</span>
                                    <span className="text-xs text-muted-foreground">Your guess: {article.userGuess || "N/A"}, Correct: {article.correctAnswer}</span>
                                </div>
                                {article.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0"/> : <XCircle className="h-5 w-5 text-red-500 shrink-0"/>}
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </CardContent>
          </Card>
      )}
      
      <div className="max-w-xl mx-auto">
        <MediaLiteracyTipsCard />
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-8 py-8">
      {gamePhase === "setup" && renderSetupPhase()}
      {gamePhase === "playing" && !isLoadingGameSetup && renderPlayingPhase()}
      {gamePhase === "feedback" && !isLoadingGameSetup && renderFeedbackPhase()}
      {gamePhase === "results" && !isLoadingGameSetup && renderResultsPhase()}
    </div>
  );
}

