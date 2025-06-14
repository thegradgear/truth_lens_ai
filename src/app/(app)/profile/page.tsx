
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { UserCircle2, Edit3, Save, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50, "Display name too long."),
  email: z.string().email("Invalid email address.").optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const changePasswordFormSchema = z.object({
  newPassword: z.string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/(?=.*[a-z])/, { message: "Password must contain at least one lowercase letter." })
    .regex(/(?=.*[A-Z])/, { message: "Password must contain at least one uppercase letter." })
    .regex(/(?=.*\d)/, { message: "Password must contain at least one number." })
    .regex(/(?=.*[@$!%*?&])/, { message: "Password must contain at least one special character (@$!%*?&)." }),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserPassword } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
    },
    values: { 
        displayName: user?.displayName || '',
        email: user?.email || '',
    }
  });
  
  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors, isSubmitting: isSubmittingProfile }, reset: resetProfileForm } = profileForm;

  const changePasswordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const { handleSubmit: handleSubmitChangePassword, formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword }, reset: resetPasswordFormFields } = changePasswordForm;


  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    // Simulate update (In a real app, you'd call an updateProfile method from AuthContext)
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Profile update data:", data);
    toast({
      title: "Profile Updated (Simulated)",
      description: "Your display name has been updated.",
    });
    // Update user in context if real update happens
    // if (user) {
    //   // This would be part of a more complex updateUserProfile in AuthContext
    //   (user as any).displayName = data.displayName; 
    // }
    setIsEditing(false);
  };

  const onChangePasswordSubmit: SubmitHandler<ChangePasswordFormValues> = async (data) => {
    try {
      await updateUserPassword(data.newPassword);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
      setIsChangePasswordDialogOpen(false);
      resetPasswordFormFields();
    } catch (error: any) {
      toast({
        title: "Password Update Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <UserCircle2 className="h-12 w-12 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to view your profile.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl md:text-3xl font-headline flex items-center">
              <UserCircle2 className="mr-3 h-8 w-8 text-primary"/>Your Profile
            </CardTitle>
            {!isEditing && (
                 <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
            )}
          </div>
          <CardDescription>
            View and manage your personal details and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{isEditing ? profileForm.getValues("displayName") : user.displayName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          
          <Form {...profileForm}>
            <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  {...registerProfile("displayName")} 
                  defaultValue={user.displayName || ''} 
                  disabled={!isEditing || isSubmittingProfile}
                  className="mt-1"
                />
                {profileErrors.displayName && <p className="text-sm text-destructive mt-1">{profileErrors.displayName.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user.email || ''} 
                  disabled 
                  readOnly
                  className="mt-1 bg-muted/50"
                />
                <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here.</p>
              </div>

              {isEditing && (
                  <div className="flex space-x-2 justify-end pt-4">
                      <Button variant="ghost" onClick={() => { setIsEditing(false); resetProfileForm({displayName: user.displayName || '', email: user.email || ''}); }} type="button" disabled={isSubmittingProfile}>
                          Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmittingProfile}>
                          {isSubmittingProfile ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                            </>
                          ) : (
                              <>
                                  <Save className="mr-2 h-4 w-4" /> Save Changes
                              </>
                          )}
                      </Button>
                  </div>
              )}
            </form>
          </Form>

          <Card className="mt-8 bg-secondary/50">
            <CardHeader>
                <CardTitle className="text-lg">Account Security</CardTitle>
            </CardHeader>
            <CardContent>
                <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><KeyRound className="mr-2 h-4 w-4" /> Change Password</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Your Password</DialogTitle>
                            <DialogDescription>
                                Enter a new password below. Make sure it's strong and memorable.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...changePasswordForm}>
                            <form onSubmit={handleSubmitChangePassword(onChangePasswordSubmit)} className="space-y-4 pt-2">
                                <FormField
                                    control={changePasswordForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input 
                                                    type={showNewPassword ? "text" : "password"} 
                                                    placeholder="••••••••" 
                                                    {...field} 
                                                    disabled={isSubmittingPassword}
                                                />
                                            </FormControl>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                disabled={isSubmittingPassword}
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={changePasswordForm.control}
                                    name="confirmNewPassword"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input 
                                                    type={showConfirmNewPassword ? "text" : "password"} 
                                                    placeholder="••••••••" 
                                                    {...field} 
                                                    disabled={isSubmittingPassword}
                                                />
                                            </FormControl>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                                disabled={isSubmittingPassword}
                                                tabIndex={-1}
                                            >
                                                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <DialogFooter className="pt-4">
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline" disabled={isSubmittingPassword}>
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isSubmittingPassword}>
                                    {isSubmittingPassword ? (
                                        <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                                        </>
                                    ) : (
                                        <>
                                        <KeyRound className="mr-2 h-4 w-4" /> Update Password
                                        </>
                                    )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                <p className="text-xs text-muted-foreground mt-2">It's a good practice to use a strong, unique password for your account.</p>
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
