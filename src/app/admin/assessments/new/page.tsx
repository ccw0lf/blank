import { AssessmentForm } from "@/components/AssessmentForm";
import { PageHeader } from "@/components/PageHeader";

export default function NewAssessment() {
  return (
    <div className="max-w-4xl">
      <PageHeader back={{ href: "/admin/assessments", label: "Assessments" }} title="New assessment" description="Set the rules first. You'll add questions on the next step." />
      <AssessmentForm />
    </div>
  );
}
