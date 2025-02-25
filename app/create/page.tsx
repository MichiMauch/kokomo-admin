import { ImageUploadForm } from "@/components/image-upload-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
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
  );
}
