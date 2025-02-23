import { ImageUploadForm } from "@/components/image-upload-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="container mx-auto p-4 max-w-2xl min-h-screen py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            KOKOMO House Blogpost erstellen!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadForm />
        </CardContent>
      </Card>
    </main>
  );
}
