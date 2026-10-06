import { AssessmentForm } from "@/components/AssessmentForm";

export default function NewAssessment() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">New assessment</h1>
      <AssessmentForm />
    </div>
  );
}
