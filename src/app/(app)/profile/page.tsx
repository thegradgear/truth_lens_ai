
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { UserCircle2, Edit3, Save } from 'lucide-react';
import { useState } from 'react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50, "Display name too long."),
  email: z.string().email("Invalid email address.").optional(), // Email might not be editable
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
    },
    values: { // Ensure form updates when user data loads
        displayName: user?.displayName || '',
        email: user?.email || '',
    }
  });
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = form;

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    // Simulate update
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Profile update data:", data);
    toast({
      title: "Profile Updated",
      description: "Your profile details have been successfully updated.",
    });
    // In a real app, update AuthContext user state here if necessary
    setIsEditing(false);
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
              <h3 className="text-xl font-semibold">{isEditing ? form.getValues("displayName") : user.displayName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input 
                id="displayName" 
                {...register("displayName")} 
                defaultValue={user.displayName || ''} 
                disabled={!isEditing}
                className="mt-1"
              />
              {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={user.email || ''} // Display user email
                disabled // Email usually not editable directly or requires verification
                readOnly
                className="mt-1 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here.</p>
            </div>

            {isEditing && (
                <div className="flex space-x-2 justify-end pt-4">
                    <Button variant="ghost" onClick={() => { setIsEditing(false); reset({displayName: user.displayName || '', email: user.email || ''}); }} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </>
                        )}
                    </Button>
                </div>
            )}
          </form>

          <Card className="mt-8 bg-secondary/50">
            <CardHeader>
                <CardTitle className="text-lg">Account Security</CardTitle>
            </CardHeader>
            <CardContent>
                <Button variant="outline" disabled>Change Password (Not Implemented)</Button>
                <p className="text-xs text-muted-foreground mt-2">For enhanced security, consider enabling two-factor authentication if available.</p>
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
