import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const { verifyEmail, user, resendVerification, isAuthenticated } = useAuth();
  
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) return;
      
      setLoading(true);
      const result = await verifyEmail(token);
      
      if (result.success) {
        setVerified(true);
        toast.success('Email verified successfully!');
      } else {
        setError(result.error);
      }
      
      setLoading(false);
    };

    verify();
  }, [token, verifyEmail]);

  const handleResend = async () => {
    setResending(true);
    const result = await resendVerification();
    
    if (result.success) {
      toast.success('Verification email sent!');
    } else {
      toast.error(result.error);
    }
    
    setResending(false);
  };

  // If user is logged in and email is already verified
  if (isAuthenticated && user?.email_verified && !token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-navy mb-4">
              Already Verified
            </h1>
            <p className="text-slate-600 mb-6">
              Your email address is already verified. You have full access to your account.
            </p>
            <Link to="/dashboard">
              <Button className="bg-navy hover:bg-navy/90 text-white font-semibold rounded-xl px-8">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state while verifying token
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md text-center">
            <Loader2 className="w-16 h-16 text-navy animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-heading font-bold text-navy mb-2">
              Verifying Your Email
            </h1>
            <p className="text-slate-600">
              Please wait while we verify your email address...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Verification successful
  if (verified) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-navy mb-4">
              Email Verified!
            </h1>
            <p className="text-slate-600 mb-6">
              Your email has been verified successfully. You now have full access to all features.
            </p>
            <Link to="/dashboard">
              <Button className="bg-navy hover:bg-navy/90 text-white font-semibold rounded-xl px-8">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Error or no token - show resend option if logged in
  if (error || !token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md text-center">
            {error ? (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-3xl font-heading font-bold text-navy mb-4">
                  Verification Failed
                </h1>
                <p className="text-slate-600 mb-6">
                  {error}
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-amber-600" />
                </div>
                <h1 className="text-3xl font-heading font-bold text-navy mb-4">
                  Verify Your Email
                </h1>
                <p className="text-slate-600 mb-6">
                  {isAuthenticated 
                    ? `We've sent a verification link to ${user?.email}. Please check your inbox and click the link to verify your account.`
                    : 'Please check your inbox for the verification link or log in to request a new one.'
                  }
                </p>
              </>
            )}
            
            <div className="space-y-4">
              {isAuthenticated && !user?.email_verified && (
                <Button
                  onClick={handleResend}
                  disabled={resending}
                  className="bg-navy hover:bg-navy/90 text-white font-semibold rounded-xl px-8"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              )}
              
              <div className="flex justify-center gap-4">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button variant="outline" className="rounded-xl">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline" className="rounded-xl">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="outline" className="rounded-xl">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
};

export default VerifyEmailPage;
