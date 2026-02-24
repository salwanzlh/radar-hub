{{- define "app.fullname" -}}
{{ .Release.Name }}
{{- end }}

{{- define "app.labels" -}}
app.kubernetes.io/name: {{ .Values.image.name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
Purpose: dnet-common-api
helm.sh/revision: "{{ .Release.Revision }}"
{{- end }}

{{- define "app.selectorLabels" -}}
app.kubernetes.io/name: {{ .Values.image.name }}
{{- end }}