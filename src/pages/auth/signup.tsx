import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form } from "formik";
import { FormikHelpers } from "formik";
import { useAppDispatch } from "@/hooks/hooks";

import { SignupSchema } from "../../validations/schemas";

import {
  FormikInput,
  FormikPasswordInput,
  FormikCheckbox,
  FormikSubmitButton,
  FormikSelect,
} from "../../formik/component";

import { authInitialValues, createFormSubmissionHandler } from "../../formik/utils";

import {
  PageContainer,
  Card,
  AuthHeader,
  SocialAuthButton,
  GoogleIcon,
  Divider,
  AuthLink,
  Alert,
} from "../../components/ui/components";

import { RegisterResponse, userSignUpAsync } from "@/services/auth/asyncThunk";
import type { RegisterDto } from "@/services/auth/endpoints";
import Toast from "@/components/Toast";
import { AuthLayout } from "@/components/layouts";

interface SignUpUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  country?: string;
  phone?: string;
  conditions: boolean;
}

const roles = ["admin", "tenant", "landlord"] as const;
const countries = ["US", "CA", "UK", "AU", "DE", "FR", "IN", "PK"] as const;

const SignUp = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleGoogleAuth = async () => {
    console.log("Google Auth clicked");
  };

  /** Map Formik values -> backend DTO expected by /api/v1/users/register */
  const toRegisterDto = (v: SignUpUserData): RegisterDto => ({
    email: v.email,
    password: v.password,
    businessName: `${v.firstName} ${v.lastName}`.trim(),
    role: v.role,
    country: v.country,
    phone: v.phone,
  });

  const registerUser = async (userData: SignUpUserData) => {
    const dto = toRegisterDto(userData);
    const result = await dispatch(userSignUpAsync(dto)).unwrap(); // RegisterResponse
    return result;
  };

  const handleSuccess = (response: unknown, formikActions: FormikHelpers<SignUpUserData>) => {
    const res = response as RegisterResponse;

    Toast.fire({
      icon: "success",
      title: "Registration successful",
      text: `Welcome, ${res.user?.businessName || res.user?.email || "User"}!`,
    });

    formikActions.setSubmitting(false);
    formikActions.resetForm();
    router.push("/auth/login");
  };

  const handleError = (error: unknown, formikActions: FormikHelpers<SignUpUserData>) => {
    const msg =
      (error && typeof error === "object" && "message" in error && (error as { message: string }).message) ||
      "Signup failed. Try again.";
    formikActions.setSubmitting(false);
  };

  const handleSubmit = createFormSubmissionHandler<SignUpUserData>(
    registerUser,
    handleSuccess,
    handleError,
    { formatData: true, excludeFields: ["conditions"] }
  );

  const initialValues: SignUpUserData = {
    ...(authInitialValues.signup as SignUpUserData),
    role: (authInitialValues.signup as any)?.role ?? "tenant",
    country: (authInitialValues.signup as any)?.country ?? "US",
    phone: (authInitialValues.signup as any)?.phone ?? "",
  };

  return (
    <AuthLayout>
      <PageContainer backgroundImage="/Frame.png">
        <Card>
          <AuthHeader title="Sign Up" />
          {authError && <Alert type="error" message={authError} className="mb-6" />}

          <SocialAuthButton onClick={handleGoogleAuth} icon={GoogleIcon} className="mb-6">
            Sign up with Google
          </SocialAuthButton>

          <Divider text="or sign up with email" />

          <Formik<SignUpUserData>
            initialValues={initialValues}
            validationSchema={SignupSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormikInput label="First Name" name="firstName" placeholder="John" />
                  <FormikInput label="Last Name" name="lastName" placeholder="Doe" />
                </div>

                <FormikInput label="Email Address" name="email" type="email" placeholder="you@example.com" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormikSelect
                    label="Role"
                    name="role"
                    options={roles.map((role) => ({ label: role, value: role }))}
                  />
                  <FormikSelect
                    label="Country"
                    name="country"
                    options={countries.map((c) => ({ label: c, value: c }))}
                  />
                  <FormikInput label="Phone" name="phone" placeholder="+1-555-0100" />
                </div>

                <FormikPasswordInput
                  label="Password"
                  name="password"
                  placeholder="••••••••"
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((s) => !s)}
                />

                <FormikPasswordInput
                  label="Confirm Password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword((s) => !s)}
                />

                <FormikCheckbox
                  label="I accept the Terms & Conditions and Privacy Policy"
                  name="conditions"
                />

                <FormikSubmitButton isSubmitting={isSubmitting} loadingText="Signing Up...">
                  Sign Up
                </FormikSubmitButton>
              </Form>
            )}
          </Formik>

          <div className="text-center mt-6 md:mt-8">
            <p className="text-gray-600 text-sm md:text-base">
              Already have an account?{" "}
              <AuthLink onClick={() => router.push("/auth/login")}>Sign In</AuthLink>
            </p>
          </div>
        </Card>
      </PageContainer>
    </AuthLayout>
  );
};

export default SignUp;
