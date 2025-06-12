
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MediaLiteracyTipsCard } from '@/components/dashboard/MediaLiteracyTipsCard'; // Re-using for tips
import { generateFakeNewsArticle, type GenerateFakeNewsArticleInput, type GenerateFakeNewsArticleOutput } from '@/ai/flows/generate-fake-news-article';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Puzzle, CheckCircle, XCircle, Award, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type GamePhase = "setup" | "playing" | "feedback" | "results";
type ArticleSourceParameters = Omit<GenerateFakeNewsArticleInput, 'topic'> & {topic?: string};

interface GameArticle {
  text: string;
  sourceParams: ArticleSourceParameters; // Store how it was generated for potential future use
  correctAnswer: 'Real' | 'Fake'; // The "truth" for the game
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
  const [currentArticleText, setCurrentArticleText] = useState<string>("");
  const [isLoadingArticle, setIsLoadingArticle] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{title: string, description: string, variant: "default" | "destructive"} | null>(null);

  const { toast } = useToast();

  const generateRandomArticleParams = (): GenerateFakeNewsArticleInput => {
    return {
        topic: getRandomElement(ARTICLE_TOPICS),
        category: getRandomElement(ARTICLE_CATEGORIES),
        tone: getRandomElement(ARTICLE_TONES),
    };
  };

  const fetchNewArticle = async () => {
    setIsLoadingArticle(true);
    setFeedbackMessage(null);
    setCurrentArticleText("");
    try {
      const params = generateRandomArticleParams();
      const result: GenerateFakeNewsArticleOutput = await generateFakeNewsArticle(params);
      if (!result.article) {
        throw new Error("AI failed to generate article content.");
      }
      const correctAnswerForGame: 'Real' | 'Fake' = Math.random() < 0.5 ? 'Real' : 'Fake';
      
      setGameArticles(prev => [
        ...prev,
        { text: result.article, sourceParams: params, correctAnswer: correctAnswerForGame }
      ]);
      setCurrentArticleText(result.article);

    } catch (error: any) {
      toast({
        title: "Error Generating Article",
        description: error.message || "Could not fetch a new article for the game. Please try again.",
        variant: "destructive",
      });
      // Potentially allow retry or end game
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const handleStartGame = () => {
    setGamePhase("playing");
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameArticles([]);
    fetchNewArticle();
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
    if (currentQuestionIndex < numQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setGamePhase("playing");
      fetchNewArticle();
    } else {
      setGamePhase("results");
    }
  };
  
  const handlePlayAgain = () => {
    setGamePhase("setup");
    // numQuestions remains as selected
  };

  const renderSetupPhase = () => (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl font-headline flex items-center"><Puzzle className="mr-3 h-7 w-7 text-primary"/>Guess Real or Fake?</CardTitle>
        <CardDescription>
          Test your media literacy skills! We'll show you AI-generated articles. You guess if they're meant to be Real or Fake in this game context.
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
          >
            {[5, 10, 15].map(num => (
              <Label
                key={num}
                htmlFor={`num-${num}`}
                className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    numQuestions === num && "border-primary ring-2 ring-primary"
                )}
              >
                <RadioGroupItem value={String(num)} id={`num-${num}`} className="sr-only" />
                <span className="text-xl font-semibold">{num}</span>
                <span className="text-xs text-muted-foreground">Questions</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full" onClick={handleStartGame}>
            <Sparkles className="mr-2 h-5 w-5" /> Start Game
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPlayingPhase = () => (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl md:text-2xl font-headline">Question {currentQuestionIndex + 1} of {numQuestions}</CardTitle>
          <div className="text-lg font-semibold">Score: {score}</div>
        </div>
        <Progress value={((currentQuestionIndex + 1) / numQuestions) * 100} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="bg-secondary/30">
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Analyze the article snippet below:</p>
                 {isLoadingArticle ? (
                    <div className="flex items-center justify-center min-h-[150px] space-x-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                        <p className="text-muted-foreground">Generating article...</p>
                    </div>
                ) : (
                    <div className="min-h-[150px] max-h-[300px] overflow-y-auto p-3 border rounded-md bg-background text-sm whitespace-pre-wrap">
                        {currentArticleText || "Loading article..."}
                    </div>
                )}
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg py-6 border-2 border-green-500 hover:bg-green-500/10 hover:text-green-600 has-[[data-active=true]]:bg-green-500 has-[[data-active=true]]:text-white"
            onClick={() => handleGuess('Real')} 
            disabled={isLoadingArticle || gamePhase === 'feedback'}
          >
            <CheckCircle className="mr-2 h-6 w-6"/> Real
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg py-6 border-2 border-red-500 hover:bg-red-500/10 hover:text-red-600 has-[[data-active=true]]:bg-red-500 has-[[data-active=true]]:text-white"
            onClick={() => handleGuess('Fake')} 
            disabled={isLoadingArticle || gamePhase === 'feedback'}
          >
            <XCircle className="mr-2 h-6 w-6"/> Fake
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderFeedbackPhase = () => (
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
        <div className="min-h-[100px] max-h-[250px] overflow-y-auto p-3 border rounded-md bg-secondary/20 text-sm whitespace-pre-wrap">
            <p className="font-medium text-muted-foreground mb-1">The article you reviewed:</p>
            {currentArticleText}
        </div>
        <Button size="lg" className="w-full" onClick={handleNextQuestion}>
          {currentQuestionIndex < numQuestions - 1 ? "Next Question" : "Show Results"}
        </Button>
      </CardContent>
    </Card>
  );


  const renderResultsPhase = () => {
    const percentage = ((score / numQuestions) * 100).toFixed(1);
    let resultMessage = "";
    if (parseFloat(percentage) >= 80) resultMessage = "Excellent job! You have a sharp eye for details.";
    else if (parseFloat(percentage) >= 50) resultMessage = "Good effort! Keep practicing to hone your skills.";
    else resultMessage = "No worries! Media literacy is a skill that improves with practice. Check the tips below.";

    return (
    <div className="space-y-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="items-center text-center">
            <Award className="h-16 w-16 text-primary mb-3"/>
          <CardTitle className="text-3xl font-headline">Game Over!</CardTitle>
          <CardDescription>
            You scored {score} out of {numQuestions} ({percentage}%).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <p className="text-lg">{resultMessage}</p>
          <Button size="lg" className="w-full" onClick={handlePlayAgain}>
            <RotateCcw className="mr-2 h-5 w-5"/> Play Again
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
            <CardTitle className="text-xl font-headline">Your Answers:</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="space-y-3 max-h-[300px] overflow-y-auto">
                {gameArticles.map((article, index) => (
                    <li key={index} className="p-3 border rounded-md flex justify-between items-center text-sm">
                        <div>
                            <span className="font-medium">Question {index + 1}:</span>
                            <span className="ml-2 text-muted-foreground">Your guess: {article.userGuess || "N/A"}, Correct: {article.correctAnswer}</span>
                        </div>
                        {article.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                    </li>
                ))}
            </ul>
        </CardContent>
      </Card>
      
      <div className="max-w-xl mx-auto">
        <MediaLiteracyTipsCard />
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-8 py-8">
      {gamePhase === "setup" && renderSetupPhase()}
      {gamePhase === "playing" && renderPlayingPhase()}
      {gamePhase === "feedback" && renderFeedbackPhase()}
      {gamePhase === "results" && renderResultsPhase()}
    </div>
  );
}
