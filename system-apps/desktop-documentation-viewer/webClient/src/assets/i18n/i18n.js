import * as i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { MVDResources } from '../../mvd-resources';

const en = {
	translation: {
		action_type: "Action Type",
		app_request_succeeded: "App request succeeded",
		app_request_test: "App Request Test",
		app_status_or_message: "App Status or Message",
		app_target_mode: "App Target Mode",
		application_identifier: "Application Identifier",
		close: "Close",
		create_new: "Create New",
		dataservice_request_test: "Dataservice Request Test",
		get_from_server: "Get from Server",
		invalid_plugin_identifier: "Invalid Plugin Identifier",
		launch: "Launch",
		message: "Message",
		parameters: "Parameters",
		plugin_request_test: "Plugin Request Test",
		response: "Response",
		reuse_any_open: "Reuse Any Open",
		run: "Run",
		save_to_server: "Save to Server",
		send_app_request: "Send App Request",
		server_replied_with: "Server replied with ",
		status_will_appear_here: "Status will appear here",
		no_or_empty_message_received_from_client: "No Or Empty Message Received from Client",
		empty_reply_from_server: "Empty Reply from Server",
		could_not_find_app_with_id_provided: "Could not find app with ID provided",
		request_succeeded: "App request succeeded",
		Error_getting_defaults: "Error getting defaults",
		Error_saving_App_ID: "Error saving App ID",
		Error_saving_parameters: "Error saving parameters" 
	}
}

const ru = {
	translation: {
		action_type: "Тип действия",
		app_request_test: "Тест запроса приложения",
		app_status_or_message: "Статус приложения или сообщение",
		app_target_mode: "Режим целевого приложения",
		application_identifier: "Идентификатор приложения",
		close: "Закрыть",
		create_new: "Создать новое",
		dataservice_request_test: "Тест сервиса данных",
		get_from_server: "Получить с сервера",
		invalid_plugin_identifier: "Неверный идентификатор плагина",
		launch: "Запуск",
		message: "Сообщение",
		parameters: "Параметры",
		plugin_request_test: "Тест запроса плагина",
		response: "Ответ",
		reuse_any_open: "Использовать открытое",
		run: "Запустить",
		save_to_server: "Сохранить на сервере",
		send_app_request: "Отправить запрос приложения",
		server_replied_with: "Сервер ответил ",
		no_or_empty_message_received_from_client: "Нет ответа от клиента",
		empty_reply_from_server: "Пустой ответ от сервера",
		could_not_find_app_with_id_provided: "Не удалось найти приложение с указанным идентификатором",
		status_will_appear_here: "Статус появится здесь",
		request_succeeded: "Запрос приложения выполнен успешно",
		Error_getting_defaults: "Error getting defaults",
		Error_saving_App_ID: "Error saving App ID",
		Error_saving_parameters: "Error saving parameters" 
	}
}

const ja = {
	translation: {
		action_type: "アクション・タイプ",
		app_request_succeeded: "アプリケーション・リクエストが成功しました",
		app_request_test: "アプリケーション・リクエスト・テスト",
		app_status_or_message: "アプリケーション・スタータス または メッセージ",
		app_target_mode: "アプリケーション・ターゲット・モード",
		application_identifier: "アプリケーションID",
		close: "閉じる",
		create_new: "新規作成",
		dataservice_request_test: "データサービス・リクエスト・テスト",
		get_from_server: "サーバーから取得",
		invalid_plugin_identifier: "無効なプラグインID",
		launch: "起動",
		message: "メッセージ",
		parameters: "パラメーター",
		plugin_request_test: "プラグイン・リクエスト・テスト",
		response: "レスポンス",
		reuse_any_open: "オープンしているものを再利用",
		run: "実行",
		save_to_server: "サーバーに保存",
		send_app_request: "アプリケーション・リクエスト送信",
		server_replied_with: "サーバーが応答を返しました",
		status_will_appear_here: "スタータスをここに表示",
		no_or_empty_message_received_from_client: "クライアントから受信したメッセージがない、あるいは空です。",
		empty_reply_from_server: "サーバーからの応答が空です。",
		could_not_find_app_with_id_provided: "指定されたIDのアプリケーションが見つかりませんでした。",
		request_succeeded: "アプリケーション・リクエストが成功しました",
		Error_getting_defaults: "Error getting defaults",
		Error_saving_App_ID: "Error saving App ID",
		Error_saving_parameters: "Error saving parameters"
	}
}

const zh = {
	translation: {
		action_type: "操作类型",
		app_request_succeeded: "应用请求成功",
		app_request_test: "应用请求测试",
		app_status_or_message: "应用状态或信息",
		app_target_mode: "应用目标模式",
		application_identifier: "应用ID",
		close: "关闭",
		create_new: "新建",
		dataservice_request_test: "数据服务请求测试",
		get_from_server: "从服务器取得",
		invalid_plugin_identifier: "错误的应用ID",
		launch: "启动",
		message: "信息",
		parameters: "参数",
		plugin_request_test: "插件请求测试",
		response: "回复",
		reuse_any_open: "使用已启动",
		run: "运行",
		save_to_server: "保存至服务器",
		send_app_request: "发送应用请求",
		server_replied_with: "服务器回复",
		status_will_appear_here: "状态显示",
		no_or_empty_message_received_from_client: "从客户端收到空消息",
		empty_reply_from_server: "服务器没有回复",
		could_not_find_app_with_id_provided: "无法找到对应ID的应用",
		request_succeeded: "应用请求成功",
		Error_getting_defaults: "Error getting defaults",
		Error_saving_App_ID: "Error saving App ID",
		Error_saving_parameters: "Error saving parameters"
	}
}

const fr = {
	translation: {
		action_type: "Type d'Action",
		app_request_succeeded: "La requête a réussie",
		app_request_test: "Test de requête",
		app_status_or_message: "Etat courant de l'Application ou Message",
		app_target_mode: "Mode d'Utilisation de l'Application",
		application_identifier: "Identité de l'Application",
		close: "Fermer",
		create_new: "Nouvelle Application",
		dataservice_request_test: "Requête de Test Service Data",
		get_from_server: "Retrouver du Serveur",
		invalid_plugin_identifier: "Identité de Plugin Invalide",
		launch: "Lancer",
		message: "Message",
		parameters: "Paramètres",
		plugin_request_test: "Requête de Test pour Plugin",
		response: "Réponse",
		reuse_any_open: "Réutiliser une application",
		run: "Exécuter",
		save_to_server: "Sauvegarder sur le Serveur",
		send_app_request: "Envoyer la Requête Application",
		server_replied_with: "Réponse du Serveur",
		status_will_appear_here: "Les détails apparaissent ici",
		no_or_empty_message_received_from_client: "Pas de réponse du client",
		empty_reply_from_server: "La réponse du serveur est vide",
		could_not_find_app_with_id_provided: "L'identifiant fourni n'appartient pas à une application existante",
		request_succeeded: "Demande à l’application réussie",
		Error_getting_defaults: "Erreur lors de l'obtention des valeurs par défaut",
		Error_saving_App_ID: "Erreur lors de l'enregistrement de l'identifiant de l'application",
		Error_saving_parameters: "Erreur lors de la sauvegarde des paramètres"
	}
}

const de = {
	translation: {
		action_type: "Art der Aktion",
		app_request_succeeded: "Die Anfrage war erfolgreich",
		app_request_test: "Testprogramm anfordern",
		app_status_or_message: "Status oder Nachricht der Anwendung",
		app_target_mode: "Anwendungsmodus",
		application_identifier: "Anwendungs-Kennung",
		close: "Schließen",
		create_new: "Neue Anwendung",
		dataservice_request_test: "Testdaten anfordern",
		get_from_server: "Vom Server holen",
		invalid_plugin_identifier: "Ungültige Plugin Kennung",
		launch: "Starten",
		message: "Nachricht",
		parameters: "Parameter",
		plugin_request_test: "Plugin Test anfordern",
		response: "Antwort",
		reuse_any_open: "Offene Anwendung wiederverwenden",
		run: "Ausführen",
		save_to_server: "Auf dem Server speichern",
		send_app_request: "Anwendung anfragen",
		server_replied_with: "Antwort des Servers",
		status_will_appear_here: "Der Status wird hier angezeigt",
		no_or_empty_message_received_from_client: "Keine/Leere Nachricht vom Client erhalten",
		empty_reply_from_server: "Leere Antwort von Server erhalten",
		could_not_find_app_with_id_provided: "Anwendung mit angegebener Kennung wurde nicht gefunden",
		request_succeeded: "Anfrage erfolgreich abgeschlossen",
		Error_getting_defaults: "Error getting defaults",
		Error_saving_App_ID: "Error saving App ID",
		Error_saving_parameters: "Error saving parameters"
	}
}

const lang = 'userLanguage';
const resources = {
  en,
  ja,
  fr,
  de,
  ru,
  zh
};

i18next.use(initReactI18next).use(LanguageDetector).init({
  resources,
  interpolation: { escapeValue: false },
  lng: window.ZoweZLUX.globalization.getLanguage(),
  fallbackLng: 'en',
  defaultNS: 'translation',
  fallbackNS: 'translation',
  ns: ['translation'],
  nonExplicitWhitelist: true,
  whitelist: ['en', 'ja', 'zh', 'de', 'fr', 'ru'],
});

export default i18next;