import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface InviteEmailProps {
  workspaceName: string
  inviterName: string
  role: "admin" | "member"
  inviteUrl: string
}

const roleLabel: Record<"admin" | "member", string> = {
  admin: "Administrador",
  member: "Membro",
}

export function InviteEmail({
  workspaceName,
  inviterName,
  role,
  inviteUrl,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} convidou você para o workspace {workspaceName} no Z4P
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>Z4P</Text>
          </Section>

          <Heading style={heading}>Você foi convidado</Heading>

          <Text style={paragraph}>
            <strong>{inviterName}</strong> convidou você para participar do
            workspace <strong>{workspaceName}</strong> como{" "}
            <strong>{roleLabel[role]}</strong>.
          </Text>

          <Text style={paragraph}>
            Clique no botão abaixo para aceitar o convite e acessar o workspace.
            Este link expira em 7 dias.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={inviteUrl}>
              Aceitar convite
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Se você não esperava este convite, pode ignorar este e-mail com
            segurança.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} Z4P by EngenhaIA. Todos os direitos
            reservados.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: "#0C0C0E",
  fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
}

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "560px",
}

const logoSection: React.CSSProperties = {
  marginBottom: "32px",
}

const logo: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "800",
  color: "#CAFF33",
  letterSpacing: "-0.5px",
  margin: "0",
}

const heading: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#E8E8E8",
  margin: "0 0 20px",
  lineHeight: "1.2",
}

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#8A8A8F",
  margin: "0 0 16px",
}

const buttonSection: React.CSSProperties = {
  margin: "32px 0",
}

const button: React.CSSProperties = {
  backgroundColor: "#CAFF33",
  color: "#0C0C0E",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  padding: "14px 28px",
  borderRadius: "8px",
  display: "inline-block",
}

const hr: React.CSSProperties = {
  borderColor: "#2A2A2E",
  margin: "32px 0 24px",
}

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#555559",
  margin: "0 0 8px",
}
