CREATE TYPE "submission_language" AS ENUM('python', 'cpp');--> statement-breakpoint
CREATE TYPE "submission_status" AS ENUM('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error');--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"code" text NOT NULL,
	"language" "submission_language" NOT NULL,
	"status" "submission_status" DEFAULT 'pending'::"submission_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
